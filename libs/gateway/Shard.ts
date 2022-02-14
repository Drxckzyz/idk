import { GatewayManager } from "."
import ws from "ws"

export class Shard {
    private connection: ws | null;
    constructor(private manager: GatewayManager, public id: number, public clusterId: number) {
        this.connection = null
    }

    async connect(baseurl: string) {
        return new Promise((resolve, reject) => {
            const url = `${baseurl}/?v=9&encoding=json`
            this.connection = new ws(url)
            resolve(this.connection)
        })
    }
}