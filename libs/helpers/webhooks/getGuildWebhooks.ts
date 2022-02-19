import { Bot } from "../../bot";
import { RESTGetAPIGuildWebhooksResult, Routes } from "discord-api-types/v9"

export async function getGuildWebhooks(bot: Bot, guildId: string): Promise<RESTGetAPIGuildWebhooksResult> {
    const res = await bot.rest.get<RESTGetAPIGuildWebhooksResult>(Routes.guildWebhooks(guildId))
    return res
}