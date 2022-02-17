import { GatewayManager } from "../libs/gateway/index"

// @ts-expect-error
const gateway = new GatewayManager({
    token: "k"
})
gateway.spawn()