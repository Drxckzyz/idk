import { Bot } from "../../bot";
import { RESTGetAPIChannelWebhooksResult, Routes } from "discord-api-types/v9"

export async function getChannelWebhooks(bot: Bot, channelId: string): Promise<RESTGetAPIChannelWebhooksResult> {
    const res = await bot.rest.get<RESTGetAPIChannelWebhooksResult>(Routes.channelWebhooks(channelId))
    return res
}