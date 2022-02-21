import { APIGuild, APIGuildMember, APIUser } from "discord-api-types/v9"

export class TestCacheManager<T = void>{
    guilds: TestCacheSystem<APIGuild>;
    members: TestCacheSystem<APIGuildMember>;
    users: TestCacheSystem<APIUser>;
    constructor() {
        this.guilds = new TestCacheSystem("Guild")
        this.members = new TestCacheSystem("GuildMember")
        this.users = new TestCacheSystem("User")
    }
}

export class TestCacheSystem<K = any> extends Map<string, K> {
    constructor(public name: string) {
        super();
    }

    update(id: string, obj: K): K {
        if (!this.has(id)) throw new Error("Requsted object to update is Not in cache")
        this.delete(id)
        this.set(id, obj)
        return obj
    }
}