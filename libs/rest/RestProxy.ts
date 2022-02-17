import { CreateRestOptions, RequestMethods } from "./Constants";

export class RestProxy {
    maxRetryCount: number;
    private readonly _token: string
    constructor(options: CreateRestOptions) {
        this.maxRetryCount = options.maxRetryCount ?? 5
        this._token = options.token
    }

    async make<T>(method: RequestMethods, path: string, data: RequestOptions = {}): Promise<T> {
        return "" as unknown as T
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

interface RequestOptions {
    body?: any;
    headers?: Record<string, string>;
    params?: any;
    reason?: string;
    abortAfter?: number;
}