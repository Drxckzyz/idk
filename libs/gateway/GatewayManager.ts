import { mergeDefault } from "../common/";
import { GatewayDispatchPayload, RESTGetAPIGatewayBotResult, Routes } from "discord-api-types/v9";
import { RestManager, RestProxy } from "../rest/index"
import { Shard } from "./Shard";

export class GatewayManager {
    buckets = new Map<number, { workers: Array<number>[], createNextShard: Array<() => Promise<any>> }>();
    clusters = new Map<number, any>();
    firstShardId: number;
    lastShardId: number;
    maxClusters: number;
    maxShards: number;
    readonly options: GatewayManagerOptions;
    rest: RestManager | RestProxy;
    shards = new Map<number, Shard>();
    shardsPerCluster: number;
    shardSpawnDelay: number;
    readonly _token: string
    constructor(options: GatewayManagerOptions) {
        this.options = mergeDefault(GatewayManagerDefaultOptions, options)
        this.firstShardId = options.firstShardId ?? 0
        this.lastShardId = options.lastShardId ?? (options.maxShards || 1)
        this.maxClusters = options.maxClusters ?? 4
        this.maxShards = options.maxShards ?? 1
        this._token = options.token
        this.shardsPerCluster = options.shardsPerCluster ?? 25
        this.shardSpawnDelay = options.shardSpawnDelay ?? 5000
        this.rest = options.rest ?? new RestManager({ token: options.token })
    }

    private prepareBuckets(maxConcurreny: number) {
        let worker = 0
        for (let i = 0; i < maxConcurreny; i++) {
            this.buckets.set(i, {
                workers: [],
                createNextShard: []
            })
        }

        for (let i = this.firstShardId; i < this.lastShardId; i++) {
            if (i >= this.maxShards) {
                continue;
            }

            const bucketId = i % maxConcurreny
            const bucket = this.buckets.get(bucketId)
            if (!bucket) throw new Error("Bucket not found when spawning Shards")

            const queue = bucket.workers.find((w) => w.length < this.shardsPerCluster + 1)
            if (queue) queue.push(i)
            else {
                if (worker + 1 <= this.maxClusters) worker++
                bucket.workers.push([worker, i])
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

        this.prepareBuckets(sessionInfo.max_concurrency)

        this.buckets.forEach(async (bucket, bucketId) => {
            for (const [workerId, ...queue] of bucket.workers) {

                for (const shardId of queue) {
                    bucket.createNextShard.push(async () => {
                        await (new Shard(this, shardId, workerId, this.options)).connect(url)
                    })
                }
            }
            await bucket.createNextShard.shift()?.()
        })
    }
}

export interface GatewayManagerOptions {
    firstShardId?: number;
    gatewayProxyEnabled?: boolean;
    handleDiscordPayload: (data: GatewayDispatchPayload, shard: Shard) => void;
    lastShardId?: number;
    maxClusters?: number;
    maxShards?: number;
    rest?: RestManager | RestProxy;
    shardsPerCluster?: number;
    shardSpawnDelay?: number;
    token: string;
}

export const GatewayManagerDefaultOptions: Omit<GatewayManagerOptions, "handleDiscordPayload"> = {
    firstShardId: 0,
    gatewayProxyEnabled: true,
    lastShardId: 0,
    maxClusters: 1,
    maxShards: 1,
    rest: undefined,
    shardsPerCluster: 25,
    shardSpawnDelay: 5000,
    token: "",
}