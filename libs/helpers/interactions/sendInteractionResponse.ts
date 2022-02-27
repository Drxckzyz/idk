import { Routes, InteractionResponseType, APIInteractionResponse } from "discord-api-types/v9";
import { Bot } from "../../";

export async function sendInteractionResponse(
    bot: Bot,
    id: string,
    token: string,
    options: APIInteractionResponse,
) {
    const res = await bot.rest.post(Routes.interactionCallback(id, token), { body: options })
    return res
}