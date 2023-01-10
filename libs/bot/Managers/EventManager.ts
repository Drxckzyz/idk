import { Bot } from "bot/bot";
import { GatewayDispatchPayload, APIGuild, APIGuildMember, GatewayInteractionCreateDispatchData } from "discord-api-types/v10";
import { readdirSync } from "fs"
import { Logger } from "logger";

const handlers = readdirSync(__dirname + "/Handlers").map((name) => name.replace(".js", "")) 
const ignore = () => { }

export class EventManager{
    bot: Bot
    logger: Logger | null
    options: CreateEventManagerOptions
    events: ClientEvents
    constructor(options: CreateEventManagerOptions, logger: Logger | null, bot: Bot){
        this.bot = bot
        this.logger = logger
        this.options = options
        this.events = {
          debug: options.events.debug ?? ignore,
          guildCreate: options.events.guildCreate ?? ignore,
          guildMemberUpdate: options.events.guildMemberUpdate ?? ignore,
          interactionCreate: options.events.interactionCreate ?? ignore,
          ready: options.events.ready ?? ignore,
          shardReady: options.events.shardReady ?? ignore
        }
    }

    async handleDiscordPayload(
        data: GatewayDispatchPayload,
        shardId: number,
        extra?: { loaded?: boolean }
      )  {
        if(!handlers.includes(data.t)) return this.logger?.debug("EventManager => Handling Discord Payload", `The event "${data.t}" handler file was not found`)
        const { default: handle } = await import(`./Handlers/${data.t}.js`)
        return handle(this.bot, data, shardId, extra)
      }
}

export interface CreateEventManagerOptions {
  events: Partial<ClientEvents>;
  separateGateway: boolean;
}

interface ClientEvents {
  debug: (msg: string) => void;
    guildCreate: (guild: APIGuild) => void;
    guildMemberUpdate: (
      newMember: APIGuildMember,
      oldMember?: APIGuildMember | undefined
    ) => void;
    interactionCreate: (
      interaction: GatewayInteractionCreateDispatchData
    ) => void;
    ready: () => void;
    shardReady: (id: number) => void;
}