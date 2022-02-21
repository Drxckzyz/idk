import { GatewayManager, GatewayManagerOptions } from "."
import ws from "ws"
import { GatewayReceivePayload, GatewayOpcodes, GatewaySendPayload, GatewayDispatchPayload, GatewayDispatchEvents, GatewayCloseCodes } from "discord-api-types/gateway/v9";
import { MessageQueue } from "../common/index"
import { GatewayError } from "../error";
import { ActivityType, APIGuild, PresenceUpdateStatus } from "discord-api-types/v9";

export class Shard {
    private connection: ws | null;
    private expectedGuilds = new Set<string>()
    private heartBeatInterval: NodeJS.Timer | null;
    public latency: number = Infinity;
    private lastHeartBeat: number | null = null;
    private lastHeartbeatAcked: boolean = false;
    private messageQueue = new MessageQueue<GatewaySendPayload>({ limit: 120, resetTime: 1000 * 60, sendFunction: (data) => this._send(data) })
    private resumeSequence: number | null = null;
    private sessionId?: string;
    private sequence = Infinity;
    public status: ShardStatus = ShardStatus.idle
    constructor(private manager: GatewayManager, public id: number, public clusterId: number) {
        this.connection = null
        this.heartBeatInterval = null
    }

    async connect(baseurl: string) {
        return new Promise((resolve, reject) => {
            const url = `${baseurl}/?v=9&encoding=json`
            this.connection = new ws(url)
            this.connection.on("message", this._handleMessage.bind(this))
            this.connection.on("open", () => this.debug(`Connected, waiting for hello`))
            this.connection.on("close", this._handleClose)
            resolve(this.connection)
        })
    }

    debug(msg: string) {
        if (!this.manager.options.debug) return
        return this.manager.options?.debug(msg, `Shard ${this.id}`)
    }

    disconnect({ reset = false, code = 1000, reconnect = true }: { reset?: boolean, code?: number, reconnect?: boolean } = {}): any {
        if (reconnect && reset) throw new Error("HOw can you reset the Shard and reconnect HUHUHUHUHUHUHUHUHUH")
        this.debug(`Disconnectingd from Gateway | Reset: ${reset} | Reconnect: ${reconnect}`)
        if (this.heartBeatInterval) clearInterval(this.heartBeatInterval)
        if (this.connection?.readyState != ws.CLOSED) {
            this.connection?.removeListener("close", this._handleClose)
            if (reconnect && this.sessionId) {
                if (this.connection?.readyState === ws.OPEN) {
                    this.connection.close(4901, "Idk: Reconncting")
                } else {
                    this.debug(`Terminating connections (state ${this.connection?.readyState})`)
                    this.connection?.terminate()
                }
            } else {
                this.connection?.close(1000, "Idk: normal")
            }
        }

        this.connection = null
        this.heartBeatInterval = null
        this.lastHeartBeat = null
        this.latency = Infinity
        this.status = ShardStatus.disconnected
        this.lastHeartbeatAcked = true

        if (reset) {
            this.sessionId = undefined
            this.sequence = -1
            this.messageQueue = new MessageQueue<GatewaySendPayload>({ limit: 120, resetTime: 1000 * 60, sendFunction: (data) => this._send(data) })
        }

        // TDOD: ITS OBV
        if (reconnect) return this.connect("wss://gateway.discord.gg")
        return
    }

    private async _handleClose(code: number) {
        this.debug(`Connection was closed with code ${code}`)

        switch (code) {
            case GatewayCloseCodes.AuthenticationFailed:
                this.debug(`Client had an invalid Token`)
                throw new GatewayError("tokenInvalid")
            case GatewayCloseCodes.DisallowedIntents:
                this.debug(`Client had Disallowed intents`)
                throw new GatewayError("disallowsIntents")
            default:
                this.debug(`Close code ${code} is Unhandled, reconnecting`)
                return this.disconnect()
        }
    }

    private async _handleDispatch(data: GatewayDispatchPayload) {
        switch (data.t) {
            case GatewayDispatchEvents.Resumed:
                this.heartbeat()
            case GatewayDispatchEvents.Ready:
                this.sessionId = data.d.session_id;
                this.manager.shards.set(this.id, this)
                const bucket = this.manager.buckets.get(this.id % 1)
                if (bucket?.createNextShard.length) {
                    setTimeout(() => {
                        bucket.createNextShard.shift()?.()
                    }, this.manager.shardSpawnDelay)
                }
            case GatewayDispatchEvents.GuildCreate:
                const guild = data.d as APIGuild
                if (this.expectedGuilds.has(guild.id)) {
                    this.expectedGuilds.delete(guild.id)
                    return this.manager.options.handleDiscordPayload({ ...data }, this.id, { loaded: true })
                }
            default:
                return this.manager.options.handleDiscordPayload(data, this.id)
        }
    }

    private _handleMessage(data: ws.RawData) {
        const payload: GatewayReceivePayload = JSON.parse(data.toString())

        if (payload.s) this.sequence = payload.s

        switch (payload.op) {
            case GatewayOpcodes.Dispatch:
                this.debug(`Gateway sent ${payload.t}`)
                this._handleDispatch(payload)
                break;
            case GatewayOpcodes.Heartbeat:
                this.heartbeat()
                break;
            case GatewayOpcodes.Reconnect:
                this.debug("Discord request Shard to reconnect")
                this.disconnect()
                break;
            case GatewayOpcodes.Hello:
                this.debug("Hello recieved, Identifying")
                if (this.heartBeatInterval) clearInterval(this.heartBeatInterval)
                this.idenitfy()
                this.heartbeat(payload.d.heartbeat_interval)
                break;
            case GatewayOpcodes.HeartbeatAck:
                this.lastHeartbeatAcked = true
                this.latency = this.lastHeartBeat ? Date.now() - this.lastHeartBeat : Infinity
                this.lastHeartBeat = Date.now()
                this.debug(`Recived Ack`)
                break;
            default:
                return this.debug(`Unhandled Event: ${payload.op} "${JSON.stringify(payload)}"`)
        }
    }

    heartbeat(ms?: number): any {
        if (ms && !this.heartBeatInterval) {
            return this.heartBeatInterval = setInterval(() => this.heartbeat(), ms)
        } else if (!this.lastHeartbeatAcked && this.lastHeartBeat != null) {
            this.debug(`Shard did not recieve an ack for the last heartbeat, Reconnecting`)
            return this.connection?.close(1000)
        }

        this.debug(`Sending heartbeat`)
        this.lastHeartbeatAcked = false
        return this.send({
            op: GatewayOpcodes.Heartbeat,
            d: this.sequence
        }, true)
    }

    idenitfy() {
        if (!this.sessionId) {
            return this.send({
                op: GatewayOpcodes.Identify,
                d: {
                    token: this.manager._token,
                    intents: 547,
                    properties: {
                        $os: process.platform,
                        $browser: "Idk",
                        $device: "Idk"
                    },
                    shard: [this.id, this.manager.options.shardList?.length ?? 1],
                    presence: {
                        activities: [
                            {
                                name: `Drx Break me | Shard ${this.id}`,
                                type: ActivityType.Watching
                            }
                        ],
                        status: PresenceUpdateStatus.DoNotDisturb,
                        since: Date.now(),
                        afk: false,
                    }
                }
            }, true)
        }

        return this.send({
            op: GatewayOpcodes.Resume,
            d: {
                token: this.manager._token,
                session_id: this.sessionId,
                seq: this.resumeSequence ?? this.sequence,
            }
        }, true)
    }
    // TODO: REDUE QUEUE SYSTEM
    send(data: GatewaySendPayload, urgent = false) {
        this.messageQueue.push(data, urgent)
        return this.messageQueue.process()
    }

    private async _send(data: GatewaySendPayload) {
        if (this.connection?.readyState != ws.OPEN) {
            this.debug(`Tried sending packet but no Connection was open`)
            setTimeout(() => {
                this.messageQueue.push(data, true)
                this.messageQueue.process()
            }, 1000 * 10)
            return
        }


        return this.connection.send(JSON.stringify(data), (err) => {
            if (err) Promise.reject(err)
        })
    }
}

enum ShardStatus {
    ready,
    connecting,
    disconnected,
    reconnecting,
    connected,
    idenitying,
    resuming,
    idle
}