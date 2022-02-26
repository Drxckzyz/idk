import { Bot } from "../../";
import { GatewayReadyDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayReadyDispatch, shardId: number) {
    // sanity checks
    const list = bot.options.shardList as Array<number>;
    console.log(bot.events)
    // This is prob the first shard so its gonna apply the user
    if (!bot.user) bot.user = data.d.user

    // if all shards are ready then we mark the bot as ready
    if (list.length === 1 || shardId === list[list.length - 1]) {
        bot.events?.ready()
        return bot.events?.shardReady(shardId)
    }


    // if not we just dont emit
    return bot.events?.shardReady(shardId)
}  