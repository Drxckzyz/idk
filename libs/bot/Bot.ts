import { GatewayManager, GatewayManagerOptions } from "../gateway/"
import { readdirSync } from "fs"
import { RestProxy, RestManager } from "../rest/"
import { APIGuild, APIGuildMember, GatewayInteractionCreateDispatchData, APIUser, GatewayDispatchPayload, GatewayPresenceUpdateData } from "discord-api-types/v9";
import { mergeDefault } from "../common/";
import { TestCacheManager } from "../cache";

const handlers = readdirSync(__dirname + "/handlers").map((name) => name.replace(".js", ""))

export class Bot {
    public cache = new TestCacheManager()
    public readonly events: EventHandlers;
    public gateway: GatewayManager | null;
    public rest: RestManager | RestProxy;
    readonly options: BotOptions;
    public user: APIUser | null;
    constructor(options: BotOptions) {
        this.options = mergeDefault<BotOptions>(DefaultBotOptions, options)
        this.validateOptions()
        // @ts-ignore
        this.events = this.options?.events ?? DefaultBotOptions.events
        const opt = this.makeOptions()
        this.rest = options.restProxy ? options.restProxy : new RestManager(opt.rest)
        this.gateway = !options.gatewayProxyEnabled ? new GatewayManager({ ...opt.gateway, rest: this.rest }) : null
        this.user = null
    }

    debug(msg: string, src: string) {
        return this.events?.debug(`${src} | ${msg}`)
    }

    start() {
        if (this.options.gatewayProxyEnabled) throw new Error("You have the Gateway Proxy enabled, you cant start this client")
        return this.gateway?.spawn()
    }

    async handlePayload(data: GatewayDispatchPayload, shardId: number, extra: { loaded?: boolean } = {}) {
        if (!handlers.includes(data.t)) return this.debug(`No handler found for ${data.t}`, 'Client#handlePayload')
        const { default: handle } = await import(`./handlers/${data.t}`)
        return handle(this, data, shardId, extra)
    }


    private makeOptions() {
        const rest = {
            token: this.options.token
        }
        const gateway: GatewayManagerOptions = {
            // @ts-expect-error
            debug: this.options.debug ? (msg: string, src: string) => this.options?.debug(`${src} | ${msg}`) : (msg: string, src: string) => this.debug(msg, src),
            firstShardId: this.options.firstShardId,
            lastShardId: this.options.lastShardId,
            handleDiscordPayload: this.options.handleDiscordPayload ?? ((data: GatewayDispatchPayload, shardId: number, extra: { loaded?: boolean } = {}) => this.handlePayload(data, shardId, extra)),
            token: this.options.token,
            maxClusters: this.options.maxClusters,
            maxShards: this.options.maxShards,
            presence: this.options.presence,
            shardSpawnDelay: this.options.shardSpawnDelay,
            shardsPerCluster: this.options.shardsPerCluster,
            shardCount: this.options.shardCount ?? "auto",
            shardList: this.options.shardList ?? "auto",
            gatewayProxyEnabled: this.options.gatewayProxyEnabled,
        }
        return { rest, gateway }
    }

    private validateOptions() {
        if (typeof this.options.token != "string") throw new TypeError(`Toke must be string`)
        else if (this.options.token === "NO_TOKEN") throw new Error("Please provide a token")
        else if (this.options.handleDiscordPayload === undefined) this.options.handleDiscordPayload = (data, shardId, extra) => this.handlePayload(data, shardId, extra)
        return
    }
}

export interface BotOptions {
    debug?: (msg: string) => void;
    events?: Partial<EventHandlers>;
    firstShardId?: number;
    gatewayProxyEnabled?: boolean
    handleDiscordPayload?: (data: GatewayDispatchPayload, shardId: number, extra?: { loaded?: boolean }) => void;
    restProxy?: RestProxy
    lastShardId?: number;
    maxClusters?: number;
    maxShards?: number;
    presence?: GatewayPresenceUpdateData;
    shardCount?: number | "auto";
    shardsPerCluster?: number;
    shardList?: Array<number> | "auto";
    shardSpawnDelay?: number;
    token: string;
}

const ignore = () => { }
export const DefaultBotOptions: BotOptions = {
    events: {
        debug: ignore,
        ready: ignore,
        guildCreate: ignore,
        guildMemberUpdate: ignore,
        shardReady: ignore,
        interactionCreate: ignore,
    },
    firstShardId: 0,
    gatewayProxyEnabled: false,
    handleDiscordPayload: undefined,
    restProxy: undefined,
    lastShardId: 1,
    maxClusters: 4,
    maxShards: 1,
    shardCount: "auto",
    shardSpawnDelay: 5000,
    shardList: "auto",
    shardsPerCluster: 25,
    token: "NO_TOKEN",
}

export interface EventHandlers {
    debug: (msg: string) => void;
    guildCreate: (guild: APIGuild) => void;
    guildMemberUpdate: (newMember: APIGuildMember, oldMember?: APIGuildMember | undefined) => void;
    interactionCreate: (interaction: GatewayInteractionCreateDispatchData) => void;
    ready: () => void;
    shardReady: (id: number) => void;
}