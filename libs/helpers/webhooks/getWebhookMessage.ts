import { APIMessage, Routes } from "discord-api-types/v9";
import { Bot } from "../../";

export async function getWebhookMessage(bot: Bot, hookId: string, hookToken: string, messageId: string, thread_id?: string): Promise<APIMessage> {
    return await bot.rest.get<APIMessage>(Routes.webhookMessage(hookId, hookToken, messageId), {
        params: {
            thread_id
        }
    })
}