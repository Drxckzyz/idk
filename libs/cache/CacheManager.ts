import redis from "ioredis"
import { APIGuild } from "discord-api-types/v9"

export class CacheManager<T = void>{
    private redis: redis.Redis;
    guilds: CacheSystem<APIGuild>;
    constructor(url: string) {
        this.redis = new redis(url)
        this.guilds = new CacheSystem("Guild", this.redis)
    }
}

export class CacheSystem<T = void> {
    constructor(public name: string, private reids: redis.Redis) {

    }

    async get(id: string): Promise<T | undefined> {
        const cached = await this.reids.get(this.makeKey(id))
        if (!cached) return undefined
        else return JSON.parse(cached)
    }

    async set(id: string, data: any): Promise<"OK" | null> {
        return this.reids.set(this.makeKey(id), JSON.stringify(data))
    }

    private makeKey(id: string) {
        return `${this.name}Key:${id}`
    }
}