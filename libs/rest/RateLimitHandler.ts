import { sleep } from "../common/Sleep";
import { RatelimitData } from ".";

export class RateLimitHandler {
    private readonly _limits: Map<string, Partial<ExtendedRatelimitData>> = new Map();

    public async claim(route: string, wait = true) {
        let timeout = this._getTimeout(route)
        let output = timeout

        if (timeout > 0) {
            if (!wait) {
                return Promise.reject(new Error(`A mutex for the "${route}" bucket locked up but was told to not wait`));
            }

            while (timeout > 0) {
                await sleep(timeout);
                timeout = await this._getTimeout(route);
                output += timeout;
            }
        }

        return output;
    }

    public global: Date | null = null;

    protected _getTimeout(route: string) {
        const globalExpiration = this.global?.getTime() ?? 0;
        /* istanbul ignore if */
        if (globalExpiration > Date.now()) {
            return globalExpiration - Date.now();
        }

        const ratelimit = this._limits.get(route);

        /* istanbul ignore if */
        if (!ratelimit) {
            this._limits.set(route, {});
            return 0;
        }

        if (ratelimit.remaining == null || ratelimit.remaining <= 0) {
            /* istanbul ignore else */
            if (ratelimit.expiresAt) {
                return Math.max(ratelimit.expiresAt.getTime() - Date.now(), 0);
            }

            /* istanbul ignore next */
            return 1e2;
        }

        ratelimit.remaining--;
        return 0;
    }

    public set(route: string, newLimits: Partial<RatelimitData>) {
        let limit = this._limits.get(route);
        /* istanbul ignore else */
        if (!limit) {
            limit = {};
            this._limits.set(route, limit);
        }

        if (newLimits.timeout != null) {
            const expiresAt = new Date(Date.now() + newLimits.timeout);
            /* istanbul ignore if */
            if (newLimits.global) {
                this.global = expiresAt;
            } else {
                limit.expiresAt = expiresAt;
            }
        }

        limit.limit = newLimits.limit ?? 0;
        limit.remaining = newLimits.remaining ?? newLimits.limit ?? Infinity;
    }
}

export interface ExtendedRatelimitData extends RatelimitData {
    expiresAt: Date;
}