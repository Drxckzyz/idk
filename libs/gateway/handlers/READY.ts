import { GatewayManager, Shard } from "..";
import { GatewayReadyDispatch } from "discord-api-types/gateway/v9"

export default function handle(data: GatewayReadyDispatch, gateway: GatewayManager, shard: Shard) {
    console.log(`Handling Ready event`)
}