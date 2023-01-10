import { Headers } from "node-fetch";
import { RequestMethods, CreateRestOptions } from "./Constants";
import { RateLimitHandler } from "./RateLimitHandler";
import { RouteBucket } from "./RouteBucket";

export class RestManager {
  buckets = new Map<string, RouteBucket>();
  handler = new RateLimitHandler();
  maxRetryCount: number;
  abortAfter: number = 100000;
  private readonly _token: string;
  constructor(options: CreateRestOptions) {
    this.maxRetryCount = options.maxRetryCount ?? 5;
    this._token = options.token;
  }

  async make<T>(method: RequestMethods, path: string, data: RequestOptions = {}): Promise<T> {
    const route = RouteBucket.makeRoute(method, path)

    let bucket = this.buckets.get(route)
    if(!bucket) {
        bucket = new RouteBucket(this, route)
        this.buckets.set(route, bucket)
    }

    const headers = new Headers()
    headers.set("Authorization", `Bot ${this._token}`)
    if(data.reason) {
        headers.set("X-Audit-Log-Reason", data.reason)
    }

    const params = data.params ? new URLSearchParams(data.params).toString() : ""

    const res = await bucket.make<T>({ body: data.body, params, headers, abortAfter: data.abortAfter ?? this.abortAfter, method, path })

    return res
  }

  public get<T>(path: string, data: RequestOptions = {}): Promise<T> {
    return this.make<T>("GET", path, data)
}

public post<T>(path: string, data: RequestOptions = {}): Promise<T> {
    return this.make<T>("POST", path, data)
}

public put<T>(path: string, data: RequestOptions = {}): Promise<T> {
    return this.make<T>("PUT", path, data)
}

public patch<T>(path: string, data: RequestOptions = {}): Promise<T> {
    return this.make<T>("PATCH", path, data)
}

public delete<T>(path: string, data: RequestOptions = {}): Promise<T> {
    return this.make<T>("DELETE", path, data)
}
}

export interface RequestOptions {
    body?: any;
    headers?: Record<string, string>;
    params?: any;
    reason?: string;
    abortAfter?: number;
}