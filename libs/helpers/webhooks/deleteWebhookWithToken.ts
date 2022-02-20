import { Routes } from "discord-api-types/v9";
import { Bot } from "../../";

export async function deleteWebhookWithToken(bot: Bot, hookId: string, hookToken: string, reason?: string): Promise<null> {
    await bot.rest.delete(Routes.webhook(hookId, hookToken), { reason })
    return null
}