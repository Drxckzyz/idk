import { Bot } from "../libs/bot"

const a = Array.from({ length: 10 }, (_, i) => i)

const bot = new Bot({
    token: "c",
    events: {
        ready: () => {
            console.log(`${bot.user?.username} is ready!`)
        },
        debug: (str) => console.log(str)
    },
    shardList: a,
    shardCount: a.length,
})
bot.start()