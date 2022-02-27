import { DiscordAPIError } from "../error";
import fetch, { Headers } from "node-fetch"
import { RestManager, RestProxy } from ".";
import { API_VERION, RequestMethods, Urls } from "./Constants";

export interface RatelimitData {
    global: boolean;
    limit: number;
    timeout: number;
    remaining: number;
}

export class RouteBucket {
    public static readonly BUCKET_TTL = 1e4;
    /*
 * Credit to https://github.com/abalabahaha/eris
 */
    public static makeRoute(method: string, url: string) {
        let route = url
            .replace(/\/([a-z-]+)\/(?:[0-9]{17,19})/g, (match, p) => (['channels', 'guilds', 'webhook'].includes(p) ? match : `/${p}/:id`))
            .replace(/\/invites\/[\w\d-]{2,}/g, '/invites/:code')
            .replace(/\/reactions\/[^/]+/g, '/reactions/:id')
            .replace(/^\/webhooks\/(\d+)\/[A-Za-z0-9-_]{64,}/, '/webhooks/$1/:token')
            .replace(/\?.*$/, '');

        // Message deletes have their own rate limit
        if (method === 'delete' && route.endsWith('/messages/:id')) {
            route = method + route;
        }

        // In this case, /channels/[idHere]/messages is correct,
        // however /channels/[idHere] is not. we need "/channels/:id"
        if (/^\/channels\/[0-9]{17,19}$/.test(route)) {
            route = route.replace(/[0-9]{17,19}/, ':id');
        }

        return route;
    }

    private readonly _destroyTimeout: NodeJS.Timeout;

    public constructor(
        public readonly rest: RestManager,
        public readonly route: string
    ) {
        this._destroyTimeout = setTimeout(() => this.rest.buckets.delete(this.route), RouteBucket.BUCKET_TTL).unref();
    }

    get handler() {
        return this.rest.handler
    }


    public async make<T = any>(options: RouteBucketMakeOptions): Promise<T> {
        this._destroyTimeout.refresh()

        // TODO: Add a retry after ratelimit shit
        const rateLimitTimeout = await this.handler.claim(this.route)
            .catch(() => Promise.reject(new Error(`A ratelimit was hit/prevented while "${this.route}"`)))

        if (rateLimitTimeout > 0) {
            // TODOD: Notify Ratelimit
            console.log(`RATELIMIT`)
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), options.abortAfter).unref()
        const url = `${Urls.BASE_URL}/v${API_VERION}${options.path}${options.params}`
        options.headers.set("Content-Type", "application/json")

        const res = await fetch(url, {
            method: options.method,
            headers: options.headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        const global = res.headers.get('x-ratelimit-global');
        const limit = res.headers.get('x-ratelimit-limit');
        const remaining = res.headers.get('x-ratelimit-remaining');
        const resetAfter = res.headers.get('x-ratelimit-reset-after');

        const state: Partial<RatelimitData> = {};

        if (global) {
            state.global = global === 'true';
        }

        if (limit) {
            state.limit = Number(limit);
        }

        if (remaining) {
            state.remaining = Number(remaining);
        }

        if (resetAfter) {
            state.timeout = Number(resetAfter) * 1000;
        }

        await this.handler.set(options.path, state)

        if (!res.ok) {
            if (res.status === 429) {
                const retry = res.headers.get('retry-after');
                /* istanbul ignore next */
                const retryAfter = Number(retry ?? 1) * 1000;

                await this.handler.set(this.route, { timeout: retryAfter });
                throw new Error(`A ratelimit was hit/prevented while "${this.route}"`)
            } else if (res.status >= 400 && res.status < 500) {
                const data = await res.json()
                throw new DiscordAPIError(data, 'code' in data ? data.code : data.error, res.status, options.method, options.path, options.body)
            }
        }

        if (res.headers.get('content-type')?.startsWith('application/json')) {
            return res.json() as Promise<T>;
        }

        return res.blob() as Promise<unknown> as Promise<T>;
    }
}

export interface RouteBucketMakeOptions {
    body?: any;
    params?: string;
    headers: Headers;
    abortAfter: number;
    method: RequestMethods;
    path: string;
}