import { GatewayReadyDispatch } from "discord-api-types";
import { Shard } from "../../gateway/index";

export default function (data: GatewayReadyDispatch, shard: Shard) {
    return console.log("READY EVENT")
}  