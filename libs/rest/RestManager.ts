import { RestManagerOptions } from "./Constants";
import axios from "axios"
import { Routes, RESTGetAPIGatewayBotResult } from "discord-api-types/v9";

export class RestManager {
    maxRetryCount: number;
    private readonly _token: string
    constructor(options: RestManagerOptions) {
        this.maxRetryCount = options.maxRetryCount ?? 5
        this._token = options.token
    }

    // TEMP
    getBotGateway(): Promise<RESTGetAPIGatewayBotResult> {
        return axios.get(`https://discord.com/api/v9` + Routes.gatewayBot(), {
            headers: {
                Authorization: `Bot ${this._token}`
            }
        }).then((data) => data.data)
    }
}