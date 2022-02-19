import { GatewayManager, GatewayManagerOptions, Shard } from "../gateway/"
import { readdirSync } from "fs"
import { RestProxy, RestManager } from "../rest/"
import { GatewayDispatchEvents, GatewayDispatchPayload } from "discord-api-types/v9";
import { mergeDefault } from "../common/";

const handlers = readdirSync(__dirname + "/handlers").map((name) => name.replace(".js", ""))

export class Bot {
    public gateway: GatewayManager | null;
    public rest: RestManager | RestProxy;
    private readonly options: BotOptions;
    constructor(options: BotOptions) {
        this.options = mergeDefault<BotOptions>(DefaultBotOptions, options)
        this.validateOptions()
        const opt = this.makeOptions()
        this.rest = options.restProxy ? options.restProxy : new RestManager(opt.rest)
        this.gateway = !options.gatewayProxyEnabled ? new GatewayManager({ ...opt.gateway, rest: this.rest }) : null
    }

    start() {
        if (this.options.gatewayProxyEnabled) throw new Error("You have the Gateway Proxy enabled, you cant start this client")
        return this.gateway?.spawn()
    }

    private async handlePayload(data: GatewayDispatchPayload, shard: Shard) {
        if (!handlers.includes(data.t)) return console.log(`No handler found for ${data.t}`)
        const { default: handle } = await import(`./handlers/${data.t}`)
        return handle(data, this.gateway, shard)
    }


    private makeOptions() {
        const rest = {
            token: this.options.token
        }
        const gateway: GatewayManagerOptions = {
            firstShardId: this.options.firstShardId,
            lastShardId: this.options.lastShardId,
            handleDiscordPayload: this.options.handleDiscordPayload ?? ((data: GatewayDispatchPayload, shard: Shard) => this.handlePayload(data, shard)),
            token: this.options.token,
            maxClusters: this.options.maxClusters,
            maxShards: this.options.maxShards,
            shardSpawnDelay: this.options.shardSpawnDelay,
            shardsPerCluster: this.options.shardsPerCluster,
            gatewayProxyEnabled: this.options.gatewayProxyEnabled,
        }
        return { rest, gateway }
    }

    private validateOptions() {
        if (typeof this.options.token != "string") throw new TypeError(`Toke must be string`)
        else if (this.options.token === "NO_TOKEN") throw new Error("Please provide a token")
        else if (this.options.handleDiscordPayload === undefined) this.options.handleDiscordPayload = (data, shard) => this.handlePayload(data, shard)
        return
    }
}

export interface BotOptions {
    firstShardId?: number;
    gatewayProxyEnabled?: boolean
    handleDiscordPayload?: (data: GatewayDispatchPayload, shard: Shard) => void;
    restProxy?: RestProxy
    lastShardId?: number;
    maxClusters?: number;
    maxShards?: number;
    shardsPerCluster?: number;
    shardSpawnDelay?: number;
    token: string;
}

export const DefaultBotOptions: BotOptions = {
    firstShardId: 0,
    gatewayProxyEnabled: false,
    handleDiscordPayload: undefined,
    restProxy: undefined,
    lastShardId: 1,
    maxClusters: 4,
    maxShards: 1,
    shardSpawnDelay: 5000,
    shardsPerCluster: 25,
    token: "NO_TOKEN",
}