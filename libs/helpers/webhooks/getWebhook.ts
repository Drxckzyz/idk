import { Bot } from "../../";
import { APIWebhook, Routes } from "discord-api-types/v9";

export async function getWebhook(bot: Bot, hookId: string): Promise<APIWebhook> {
    return await bot.rest.get<APIWebhook>(Routes.webhook(hookId))
}