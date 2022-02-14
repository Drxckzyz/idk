import { GatewayManager } from "."

export class Shard {
    constructor(manager: GatewayManager, id: number, clusterId: number) {

    }

    async connect() {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(null), 1000 * 20)
        })
    }
}