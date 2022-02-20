import { Routes } from "discord-api-types/v9";
import { Bot } from "../../";

export async function deleteWebhook(bot: Bot, hookId: string, reason?: string): Promise<null> {
    await bot.rest.delete(Routes.webhook(hookId), { reason })
    return null
}