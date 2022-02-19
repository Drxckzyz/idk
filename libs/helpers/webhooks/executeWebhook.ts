import { Bot } from "../../";
import { RESTPostAPIWebhookWithTokenJSONBody, Snowflake, APIMessage, Routes } from "discord-api-types/v9"

export async function executeWebhook(bot: Bot, hookId: string, hookToken: string, options: ExecuteWebhookOptions): Promise<APIMessage | null> {
    const body: RESTPostAPIWebhookWithTokenJSONBody = {
        allowed_mentions: options.allowed_mentions,
        attachments: options.attachments,
        avatar_url: options.avatar_url,
        components: options.components,
        content: options.content,
        embeds: options.embeds,
        flags: options.flags,
        tts: options.tts,
        username: options.username,
    }

    const res = await bot.rest.post<APIMessage>(Routes.webhook(hookId, hookToken), {
        body,
        params: {
            wait: options.wait ?? false,
            thread_id: options.thread_id ?? "",
        }
    })

    if (!options.wait) return null
    return res
}

export interface ExecuteWebhookOptions extends RESTPostAPIWebhookWithTokenJSONBody {
    wait?: boolean;
    thread_id?: Snowflake;
}