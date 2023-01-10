import { Bot } from "../../bot";
import { GatewayReadyDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayReadyDispatch, shardId: number, extra: { loaded?: boolean, shardList: number[] }) {
    // sanity checks
    const list = extra.shardList as Array<number>;
    // This is prob the first shard so its gonna apply the user
    if (!bot.user) bot.user = data.d.user
    // if all shards are ready then we mark the bot as ready
    if (list.length === 1 || shardId === list[list.length - 1]) {
        bot.eventManager.events.ready()
        return bot.eventManager.events.shardReady(shardId)
    }


    // if not we just dont emit
    return bot.eventManager.events.shardReady(shardId)
}