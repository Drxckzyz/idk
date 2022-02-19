import { Bot } from "../../bot";
import { APIWebhook, RESTPostAPIChannelWebhookJSONBody, Routes } from "discord-api-types/v9"
import { urlToBase64 } from "../../index";

export async function createWebhook(bot: Bot, options: RESTPostAPIChannelWebhookJSONBody & { channel_id: string, reason?: string }): Promise<APIWebhook> {
    const body = {
        name: options.name,
        avatar: options.avatar ? await urlToBase64(options.avatar) : undefined,
    }

    const res = await bot.rest.post<APIWebhook>(Routes.channelWebhooks(options.channel_id), {
        body,
        reason: options.reason,
    })

    return res
}