import { Bot } from "../../";
import { GatewayReadyDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayReadyDispatch, shardId: number) {
    if (bot.options.maxShards === 1) {
        return bot.events?.ready()
    }


    // TDOD: Shards will change into an array rather than first ad last shard Id
    return bot.events?.ready()
}  