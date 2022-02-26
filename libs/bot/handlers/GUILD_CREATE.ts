import { Bot } from "../../";
import { GatewayGuildCreateDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayGuildCreateDispatch, _shardId: number, extra: { loaded?: boolean } = {}) {
    const cache = bot.cache.guilds
    const guild = data.d

    if (extra.loaded) {
        if (cache.has(guild.id)) cache.update(guild.id, guild)
        else cache.set(guild.id, guild)
        return
    }

    cache.set(guild.id, guild)
    return bot.events?.guildCreate(guild)
}  