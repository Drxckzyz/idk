import { Bot } from "../../";
import { APIGuildMember, GatewayGuildMemberUpdateDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayGuildMemberUpdateDispatch, shardId: number, extra: { loaded?: boolean } = {}) {
    const cache = bot.cache.members
    const member = data.d
    const oldMember = cache.get(member.user.id)

    if (cache.has(member.user.id)) cache.update(member.user.id, member as APIGuildMember)
    else cache.set(member.user.id, member as APIGuildMember)
    return bot.events?.guildMemberUpdate(member as APIGuildMember, oldMember)
}  