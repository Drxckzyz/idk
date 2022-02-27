import { Bot } from "../../";
import { GatewayInteractionCreateDispatch } from "discord-api-types/v9";

export default function (bot: Bot, data: GatewayInteractionCreateDispatch, shardId: number) {
    return bot.events?.interactionCreate(data.d)
}  