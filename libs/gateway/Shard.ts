import { GatewayManager } from "."
import ws from "ws"
import { GatewayReceivePayload, GatewayOpcodes, GatewaySendPayload, GatewayDispatchPayload } from "discord-api-types/gateway/v9";
import { Queue } from "../common/index"
import { readdirSync } from "fs"

const handlers = readdirSync("build/libs/gateway/handlers").map((name) => name.replace(".js", ""))

export class Shard {
    private connection: ws | null;
    private messageQueue = new Queue()
    private sessionId?: string;
    constructor(private manager: GatewayManager, public id: number, public clusterId: number) {
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

    private _handleDispatch(data: GatewayDispatchPayload) {
        console.log(handlers, handlers.includes(data.t))
    }

    private _handleMessage(data: ws.RawData) {
        const payload: GatewayReceivePayload = JSON.parse(data.toString())
        console.log(payload)

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
        return this.messageQueue.run(() => this._send(data), urgent)
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