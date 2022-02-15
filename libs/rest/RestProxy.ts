import { CreateRestOptions } from "./Constants";

export class RestProxy {
    maxRetryCount: number;
    private readonly _token: string
    constructor(options: CreateRestOptions) {
        this.maxRetryCount = options.maxRetryCount ?? 5
        this._token = options.token
    }
}