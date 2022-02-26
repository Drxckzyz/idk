import { ActivityType, PresenceUpdateStatus } from "discord-api-types/v9"
import { Bot, updateBotPresence } from "../libs"

const a = Array.from({ length: 10 }, (_, i) => i)

const bot = new Bot({
    token: "c",
    events: {
        ready: () => {
            console.log(`${bot.user?.username} is ready on all Shards`)
        },
        debug: (str) => console.log(str),
        shardReady: (id) => {
            console.log(`Shard ${id} is ready`)
            updateBotPresence(bot, {
                status: PresenceUpdateStatus.DoNotDisturb,
                activities: [{ name: `Drx break  me | Shard ${id}`, type: ActivityType.Watching }],
                since: Date.now(),
                afk: false,
            }, id)
        }
    },
    shardList: a,
    shardCount: a.length,
})
bot.start()