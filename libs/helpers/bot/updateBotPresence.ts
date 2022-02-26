import { GatewayOpcodes, GatewayPresenceUpdateData } from "discord-api-types/v9";
import { GatewayManager, Bot } from "../../";

// This fuctions works on the gateway and bot
export async function updateBotPresence(botOrGateway: Bot | GatewayManager, presnse: GatewayPresenceUpdateData, shardId?: number) {
    if (botOrGateway instanceof Bot && botOrGateway.options.gatewayProxyEnabled) throw new Error("Cannot set presence with bot when using gateway proxy")
    const shards = botOrGateway instanceof Bot ? botOrGateway.gateway?.shards : botOrGateway.shards
    if (!shards || !shards.size) return
    if (shardId) {
        const shard = shards?.get(shardId)
        if (!shard) throw new Error(`Specified shard for Presence Update does not exists [Either its not on this gateway or does not exists at all]`)
        return shard.send({
            op: GatewayOpcodes.PresenceUpdate,
            d: presnse
        })
    }

    return shards.forEach((shard) => {
        shard.send({
            op: GatewayOpcodes.PresenceUpdate,
            d: presnse
        })
    })
}