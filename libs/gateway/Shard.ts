import { GatewayManager, GatewayManagerOptions } from "."
import ws from "ws"
import { GatewayReceivePayload, GatewayOpcodes, GatewaySendPayload, GatewayDispatchPayload, GatewayDispatchEvents, GatewayCloseCodes } from "discord-api-types/gateway/v9";
import { MessageQueue } from "../common/index"
import { GatewayError } from "../error";


export class Shard {
    private connection: ws | null;
    private heartBeatInterval: NodeJS.Timer | null;
    private messageQueue = new MessageQueue<GatewaySendPayload>({ limit: 120, resetTime: 1000 * 60, sendFunction: (data) => this._send(data) })
    private sessionId?: string;
    private sequence = Infinity;
    constructor(private manager: GatewayManager, public id: number, public clusterId: number, private manageOptions: GatewayManagerOptions) {
        this.connection = null
        this.heartBeatInterval = null
    }

    async connect(baseurl: string) {
        return new Promise((resolve, reject) => {
            const url = `${baseurl}/?v=9&encoding=json`
            this.connection = new ws(url)
            this.connection.on("message", this._handleMessage.bind(this))
            this.connection.on("open", () => this.debug(`Connected, waiting for hello`))
            this.connection.on("close", this._handleClose.bind(this))
            resolve(this.connection)
        })
    }

    debug(msg: string) {
        return console.log(`Shard ${this.id} | ${msg}`)
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
                return this.debug(`Close code ${code} is Unhandled, doing nothing....`)
        }
    }

    private async _handleDispatch(data: GatewayDispatchPayload) {
        switch (data.t) {
            case GatewayDispatchEvents.Ready:
                this.sessionId = data.d.session_id;
                const bucket = this.manager.buckets.get(this.id % 1)
                if (bucket?.createNextShard.length) {
                    setTimeout(() => {
                        bucket.createNextShard.shift()?.()
                    }, this.manageOptions.shardSpawnDelay)
                }
            default:
                return this.manageOptions.handleDiscordPayload(data, this.id)
        }
    }

    private _handleMessage(data: ws.RawData) {
        const payload: GatewayReceivePayload = JSON.parse(data.toString())

        if (payload.s) this.sequence = payload.s
        console.log("RECIEVED", payload)

        switch (payload.op) {
            case GatewayOpcodes.Dispatch:
                this._handleDispatch(payload)
                break;
            case GatewayOpcodes.Hello:
                this.debug("Hello recieved, Identifying")
                this.idenitfy()
                this.heartbeat(payload.d.heartbeat_interval)
                break;
            default:
                return this.debug(`Unhandled Event: ${payload.op} "${JSON.stringify(payload)}"`)
        }
    }

    heartbeat(ms?: number): any {
        if (ms && !this.heartBeatInterval) {
            return this.heartBeatInterval = setInterval(() => this.heartbeat(), ms)
        }

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
                    shard: [this.id, this.manager.maxShards]
                }
            }, true)
        }

        return this.send({
            op: GatewayOpcodes.Resume,
            d: {
                token: this.manager._token,
                session_id: this.sessionId,
                seq: this.sequence,
            }
        }, true)
    }

    // TODO: REDUE QUEUE SYSTEM
    send(data: GatewaySendPayload, urgent = false) {
        this.messageQueue.push(data, urgent)
        return this.messageQueue.process()
    }

    private async _send(data: GatewaySendPayload) {
        console.log("SENDING", data)
        if (this.connection?.readyState != ws.OPEN) {
            this.messageQueue.push(data, true)
            this.messageQueue.process()
            return
        }


        return this.connection.send(JSON.stringify(data), (err) => {
            if (err) Promise.reject(err)
        })
    }
}