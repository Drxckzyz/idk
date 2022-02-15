import { GatewayManager, GatewayManagerOptions } from "."
import ws from "ws"
import { GatewayReceivePayload, GatewayOpcodes, GatewaySendPayload, GatewayDispatchPayload, GatewayDispatchEvents } from "discord-api-types/gateway/v9";
import { MessageQueue } from "../common/index"


export class Shard {
    private connection: ws | null;
    private messageQueue = new MessageQueue<GatewaySendPayload>({ limit: 120, resetTime: 1000 * 60, sendFunction: (data) => this._send(data) })
    private sessionId?: string;
    constructor(private manager: GatewayManager, public id: number, public clusterId: number, private manageOptions: GatewayManagerOptions) {
        this.connection = null
    }

    async connect(baseurl: string) {
        return new Promise((resolve, reject) => {
            const url = `${baseurl}/?v=9&encoding=json`
            this.connection = new ws(url)
            this.connection.on("message", this._handleMessage.bind(this))
            resolve(this.connection)
        })
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
                return this.manageOptions.handleDiscordPayload(data, this)
        }
    }

    private _handleMessage(data: ws.RawData) {
        const payload: GatewayReceivePayload = JSON.parse(data.toString())

        switch (payload.op) {
            case GatewayOpcodes.Dispatch:
                this._handleDispatch(payload)
                break;
            case GatewayOpcodes.Hello:
                this.idenitfy()
                break;
            default:
                return console.log(`Unhandled Event: ${payload.op} "${payload}"`)
        }
    }

    idenitfy() {
        if (!this.sessionId) {
            return this.send({
                op: GatewayOpcodes.Identify,
                d: {
                    token: this.manager._token,
                    intents: 513,
                    properties: {
                        $os: process.platform,
                        $browser: "Idk",
                        $device: "Idk"
                    },
                    shard: [this.id, this.manager.maxShards]
                }
            }, true)
        }
    }

    // TODO: REDUE QUEUE SYSTEM
    send(data: GatewaySendPayload, urgent = false) {
        this.messageQueue.push(data, urgent)
        return this.messageQueue.process()
    }

    private async _send(data: GatewaySendPayload) {
        if (this.connection?.readyState != ws.OPEN) {
            //REQUEUE
            return
        }


        return this.connection.send(JSON.stringify(data), (err) => {
            if (err) Promise.reject(err)
        })
    }
}