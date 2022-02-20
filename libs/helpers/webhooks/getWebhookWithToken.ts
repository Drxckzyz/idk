import { Bot } from "../../";
import { APIWebhook, Routes } from "discord-api-types/v9";

export async function getWebhookWithToken(bot: Bot, hookId: string, hookToken: string): Promise<Omit<APIWebhook, "user">> {
    return await bot.rest.get<APIWebhook>(Routes.webhook(hookId, hookToken))
}