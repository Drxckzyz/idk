import { Routes } from "discord-api-types/v9";
import { Bot } from "../../";

export async function deleteWebhookMessage(bot: Bot, hookId: string, hookToken: string, messageId: string, thread_id: string): Promise<null> {
    await bot.rest.delete(Routes.webhookMessage(hookId, hookToken, messageId), {
        params: { thread_id }
    })
    return null
}