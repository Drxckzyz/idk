import { RestManager, CreateRestOptions } from "../rest";
import { getBotIdFromToken } from "../helpers";
import { createLogger, Logger } from "../logger";
import { EventManager, CreateEventManagerOptions } from "./Managers";
import { GatewayManager, GatewayManagerOptions } from "../gateway/GatewayManager";
import { APIUser, GatewayPresenceUpdateData } from "discord-api-types/v10";

export class Bot {
  public eventManager: EventManager;
  public gateway?: GatewayManager;
  public id: string;
  public logger: Logger | null;
  public rest: RestManager;
  public _options: CreateBotOptions;
  public user: APIUser | null = null;
  constructor(options: CreateBotOptions) {
    this.logger =
      options.loggerOptions != null
        ? options.loggerOptions.enabled
          ? createLogger(options.loggerOptions.level)
          : null
        : null;
    this.eventManager = new EventManager(
      options.eventOptions,
      this.logger,
      this
    );
    this.id = getBotIdFromToken(options.token);
    this.rest = new RestManager(options.restManager);
    this._options = options;
    if (!options.gatewayManager.proxyEnabled)
      this.gateway = new GatewayManager({
        token: this._options.token,
        firstShardId: options.gatewayManager.options.firstShardId,
        gatewayProxyEnabled: options.gatewayManager.proxyEnabled,
        lastShardId: options.gatewayManager.options.lastShardId,
        maxClusters: options.gatewayManager.options.maxClusters,
        presence: options.gatewayManager.options.presence,
        rest: this.rest,
        shardCount: options.gatewayManager.options.shardCount,
        shardList: options.gatewayManager.options.shardList,
        shardSpawnDelay: options.gatewayManager.options.shardSpawnDelay,
        shardsPerCluster: options.gatewayManager.options.shardsPerCluster,
        maxShards: options.gatewayManager.options.maxShards,
        handleDiscordPayload: (data, shardId, extra) => {
            return this.eventManager.handleDiscordPayload(data, shardId, extra)
        },
        logger: this.logger,
      });
  }

  async start(){
    if(this._options.gatewayManager.proxyEnabled) throw new Error(`IDIOT`)
    return this.gateway?.spawn()
  }
}

export interface CreateBotOptions {
  debug: boolean;
  eventOptions: CreateEventManagerOptions;
  gatewayManager: {
    proxyEnabled: boolean;
    options: {
      firstShardId?: number;
    gatewayProxyEnabled?: boolean;
    lastShardId?: number;
    maxClusters?: number;
    maxShards?: number;
    presence?: GatewayPresenceUpdateData;
    rest?: RestManager;
    shardCount?: number | "auto";
    shardsPerCluster?: number;
    shardSpawnDelay?: number;
    shardList?: Array<number> | "auto";
    };
  };
  loggerOptions: {
    enabled: boolean;
    level: "debug" | "production";
  } | null;
  restManager: CreateRestOptions;
  token: string;
} 