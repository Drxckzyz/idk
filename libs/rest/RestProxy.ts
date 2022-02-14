import { CreateRestOptions } from "./Constants";
import axios from "axios"
import { Routes, RESTGetAPIGatewayBotResult } from "discord-api-types/v9";

export class RestProxy {
    maxRetryCount: number;
    private readonly _token: string
    constructor(options: CreateRestOptions) {
        this.maxRetryCount = options.maxRetryCount ?? 5
        this._token = options.token
    }

    // TEMP
    getBotGateway(): Promise<RESTGetAPIGatewayBotResult> {
        return axios.get(Routes.gatewayBot(), {
            headers: {
                Authorization: `Bot ${this._token}`
            }
        })
    }
}