import { ActivityType, PresenceUpdateStatus } from "discord-api-types/v9"
import { Bot, updateBotPresence } from "../libs"

const a = Array.from({ length: 10 }, (_, i) => i)

const bot: Bot = new Bot({
    token: "NzgxMzA0NTY3MDUyMjM4ODU4.GfP2FJ.XB91xI9S0uYoP2HmX_iKAozOmm8a6ahtmPjzR4",
    debug: true,
    eventOptions: {
        events: {
            ready() {
                console.log("bot is ready")
            },
            shardReady(id) {
                return updateBotPresence(bot, {
                    activities: [
                        {
                            name: `Shard ${id}`,
                            type: ActivityType.Playing
                        }
                    ],
                    status: PresenceUpdateStatus.Online,
                    since: Date.now(),
                    afk: true,
                }, id)
            },
        },
        separateGateway: false,
    },
    gatewayManager: {
        proxyEnabled: false,
        options: {}
    },
    loggerOptions: {
        enabled: true,
        level: "debug"
    },
    restManager: {
        token: "NzgxMzA0NTY3MDUyMjM4ODU4.GfP2FJ.XB91xI9S0uYoP2HmX_iKAozOmm8a6ahtmPjzR4",
    }
})
bot.start()