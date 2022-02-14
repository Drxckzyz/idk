import { CreateRestOptions } from "./Constants";
import { Routes, RESTGetAPIGatewayBotResult } from "discord-api-types/v9";
import { Bucket } from ".";

export class RestProxy {
    maxRetryCount: number;
    private readonly _token: string
    constructor(options: CreateRestOptions) {
        this.maxRetryCount = options.maxRetryCount ?? 5
        this._token = options.token
    }
}