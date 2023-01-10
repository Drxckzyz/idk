import { RestManager } from "../rest/RestManager";
import { GatewayDispatchPayload, RESTGetAPIGatewayBotResult, Routes, GatewayPresenceUpdateData } from "discord-api-types/v9";
import { Logger } from "logger";
import { Shard } from "./Shard";

export class GatewayManager{
    buckets = new Map<number, { workers: Array<number>[], shardCreateQueue: Array<() => Promise<any>> }>();
    firstShardId: number;
    lastShardId: number;
    maxShards: number;
    readonly options: GatewayManagerOptions;
    rest: RestManager;
    shards = new Map<number, Shard>();
    shardSpawnDelay: number;
    readonly _token: string;
    maxClusters: number;
    shardList: Array<number> | "auto";
    shardsPerCluster: number;
    gatewayURL: string = "";
    logger: Logger | null;
    shardCount: number | "auto";

    constructor(options: GatewayManagerOptions){
        this.options = options
        this.firstShardId = options.firstShardId ?? 0
        this.lastShardId = options.lastShardId ?? (options.maxShards ?? 1)
        this.maxShards = options.maxShards ?? 1
        this.shardSpawnDelay = options.shardSpawnDelay ?? 5000
        this.rest = options.rest ?? new RestManager({ token: options.token })
        this._token = options.token
        this.maxClusters = options.maxClusters ?? 1
        this.shardList = options.shardList ?? "auto"
        this.shardsPerCluster = options.shardsPerCluster ?? 1000
        this.logger = options.logger
        this.shardCount = options.shardCount ?? "auto"
    }

    private prepareBuckets(maxConcurreny: number) {
        let worker = 0
        for (let i = 0; i < maxConcurreny; i++) {
            console.log(maxConcurreny, i)
            this.buckets.set(i, {
                workers: [],
                shardCreateQueue: []
            })
        }

        const list = this.shardList as Array<number>;
        for (const shardId of list) {
            const bucketId = shardId % maxConcurreny
            const bucket = this.buckets.get(bucketId)
            if (!bucket) throw new Error("Bucket not found when spawning Shards")

            const queue = bucket.workers.find((w) => w.length < this.shardsPerCluster + 1)
            if (queue) queue.push(shardId)
            else {
                if (worker + 1 <= this.maxClusters) worker++
                bucket.workers.push([worker, shardId])
            }
        }
    }

    async spawn() {
        // TODOD: CHeck to see if data is already passed to avoid ratelimits
        const {
            url,
            shards: recommanedShards,
            session_start_limit: sessionInfo
        } = await this.rest.get<RESTGetAPIGatewayBotResult>(Routes.gatewayBot())
        this.gatewayURL = `${url}/?v=10&encoding=json`
        if (this.shardCount === "auto") {
            this.options.shardCount = this.shardCount = recommanedShards
        }
        if (this.shardList === "auto") {
            this.options.shardList = this.shardList = Array.from({ length: recommanedShards }, (_, id) => id)
        }

        this.prepareBuckets(sessionInfo.max_concurrency)

        this.buckets.forEach(async (bucket, bucketId) => {
            for (const [workerId, ...queue] of bucket.workers) {

                for (const shardId of queue) {
                    bucket.shardCreateQueue.push(async () => {
                        await (new Shard(this, shardId, workerId)).connect(url)
                    })
                }
            }
            await bucket.shardCreateQueue.shift()?.()
        })
    }
}

export interface GatewayManagerOptions {
    firstShardId?: number;
    gatewayProxyEnabled?: boolean;
    handleDiscordPayload: (data: GatewayDispatchPayload, shardId: number, extra?: { loaded?: boolean, shardList: Array<number> }) => void;
    lastShardId?: number;
    maxClusters?: number;
    maxShards?: number;
    presence?: GatewayPresenceUpdateData;
    rest?: RestManager;
    shardCount?: number | "auto";
    shardsPerCluster?: number;
    shardSpawnDelay?: number;
    shardList?: Array<number> | "auto";
    token: string;
    logger: Logger | null;
}