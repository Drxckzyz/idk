import { GatewayManager } from "./GatewayManager";
import ws from "ws";
import { MessageQueue } from "../common";
import {
  GatewaySendPayload,
  GatewayCloseCodes,
  GatewayDispatchPayload,
  GatewayDispatchEvents,
  APIGuild,
  GatewayOpcodes,
  GatewayReceivePayload,
} from "discord-api-types/v10";

export class Shard {
  private connection: ws | null;
  private expectedGuilds = new Set<string>();
  private heartbeatInterval: NodeJS.Timer | null;
  public latency: number = Infinity;
  private lastHeartbeat: number | null = null;
  private lastHeartbeatAcked: boolean = false;
  private messageQueue = new MessageQueue<GatewaySendPayload>({
    limit: 120,
    resetTime: 1000 * 60,
    sendFunction: (data) => this._send(data),
  });
  private resumeURL: string | null = null;
  private resumeSequence: number | null = null;
  private sessionId: string | null = null;
  private sequence = Infinity;
  private status: ShardStatus = ShardStatus.idle;
  #connectTimeout: NodeJS.Timeout | null = null;
  constructor(
    private manager: GatewayManager,
    public id: number,
    clusterId: number
  ) {
    this.connection = null;
    this.heartbeatInterval = null;
  }

  get logger() {
    return this.manager.logger;
  }

  async connect(baseUrl: string) {
    return new Promise((resolve, reject) => {
      if (this.sessionId) {
        if (this.resumeURL === null) {
          this.manager.logger?.warn(
            `Shard ${this.id} => Connection`,
            "Resume url is not present. Discord may disconnect you quicker."
          );
        }
      }
      this.connection = new ws(this.resumeURL ?? this.manager.gatewayURL);
      this.connection.on("message", this._handleMessage.bind(this));
      this.connection.on("open", this._handleOpen.bind(this));
      this.connection.on("close", this._handleClose.bind(this));
      this.#connectTimeout = setTimeout(() => {
        if (this.status != ShardStatus.connected) {
          this.manager.logger?.error(
            `[Shard ${this.id} => Connection Timeout]`,
            "The Shard did not connect in time"
          );
        }
      }, 1000 * 45);
      resolve(this.connection);
    });
  }

  disconnect({
    reset = false,
    code = 1000,
    reconnect = true,
  }: { reset?: boolean; code?: number; reconnect?: boolean } = {}): any {
    if (reconnect && reset)
      throw new Error(
        "HOw can you reset the Shard and reconnect HUHUHUHUHUHUHUHUHUH"
      );
    this.manager.logger?.debug(
      `Shard ${this.id} => Disconnection`,
      `Disconnecting from Gateway | Reset: ${reset} | Reconnect: ${reconnect}`
    );
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.connection?.readyState != ws.CLOSED) {
      this.connection?.removeListener("close", this._handleClose);
      if (reconnect && this.sessionId) {
        if (this.connection?.readyState === ws.OPEN) {
          this.connection.close(4901, "Idk: Reconncting");
        } else {
          this.manager.logger?.debug(
            `[Shard ${this.id} => Connection]`,
            `Terminating connection (state: ${this.connection?.readyState})`
          );
          this.connection?.terminate();
        }
      } else {
        this.connection?.close(1000, "Idk: normal");
      }
    }
    
    this.connection = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.latency = Infinity;
    this.status = ShardStatus.disconnected;
    this.lastHeartbeatAcked = true;

    if (reset) {
      this.sessionId = null;
      this.sequence = -1;
      this.messageQueue = new MessageQueue<GatewaySendPayload>({
        limit: 120,
        resetTime: 1000 * 60,
        sendFunction: (data) => this._send(data),
      });
    }

    // TDOD: ITS OBV
    if (reconnect) return this.connect("");
    return;
  }

  private _handleOpen() {
    this.logger?.debug(
      `Shard ${this.id} => Connection`,
      `Connection to Gateway is actcive, waiting n hello.`
    );
    if (this.#connectTimeout) clearTimeout(this.#connectTimeout);
    this.status = ShardStatus.connected
    return
  }

  private async _handleClose(code: number) {
    this.manager.logger?.debug(
      `[Shard ${this.id} => Connection]`,
      `Connection was closed with code ${code}`
    );
    switch (code) {
      case GatewayCloseCodes.AuthenticationFailed:
        this.logger?.error(
          `Shard ${this.id} => Gateway Closed Reason`,
          `The token provided is invalid.`
        );
        throw new Error("tokenInvalid");
      case GatewayCloseCodes.DisallowedIntents:
        this.logger?.debug(
          `[Shard ${this.id} => Gateway Closed Reason]`,
          `Client had Disallowed intents`
        );
        throw new Error("disallowsIntents");
      default:
        this.logger?.debug(
          `Shard ${this.id} => Gateway Closed Reason`,
          `Close code ${code} is Unhandled, reconnecting`
        );
        return this.disconnect();
    }
  }

  private async _handleDispatch(data: GatewayDispatchPayload) {
    switch (data.t) {
      case GatewayDispatchEvents.Resumed:
        this.status = ShardStatus.connected
        this.logger?.debug(
          `[Shard ${this.id} => Connection]`,
          `Connection has resumed.`
        );
        this.heartbeat();
      case GatewayDispatchEvents.Ready:
        this.status = ShardStatus.ready
        this.sessionId = data.d.session_id;
        this.manager.shards.set(this.id, this);
        const bucket = this.manager.buckets.get(this.id % 1);
        if (bucket?.shardCreateQueue.length) {
          setTimeout(() => {
            bucket.shardCreateQueue.shift()?.();
          }, this.manager.shardSpawnDelay);
        }
      case GatewayDispatchEvents.GuildCreate:
        const guild = data.d as APIGuild;
        if (this.expectedGuilds.has(guild.id)) {
          this.expectedGuilds.delete(guild.id);
          return this.manager.options.handleDiscordPayload(
            { ...data },
            this.id,
            { loaded: true, shardList: this.manager.shardList as number[] }
          );
        }
      default:
        return this.manager.options.handleDiscordPayload(data, this.id, { shardList: this.manager.shardList as number[] });
    }
  }

  private _handleMessage(data: ws.RawData) {
    const payload: GatewayReceivePayload = JSON.parse(data.toString());

    if (payload.s) this.sequence = payload.s;

    switch (payload.op) {
      case GatewayOpcodes.Dispatch:
        this.logger?.debug(
          `Shard ${this.id} => Connection Message`,
          `Gateway sent ${payload.t}`
        );
        this._handleDispatch(payload);
        break;
      case GatewayOpcodes.Heartbeat:
        this.heartbeat();
        break;
      case GatewayOpcodes.Reconnect:
        this.status = ShardStatus.reconnecting
        this.logger?.debug(
          `Shard ${this.id} => Connection`,
          "Discord request Shard to reconnect"
        );
        this.disconnect();
        break;
      case GatewayOpcodes.Hello:
        this.logger?.debug(
          `Shard ${this.id} => Connection`,
          "Hello recieved, Identifying"
        );
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.idenitfy();
        this.heartbeat(payload.d.heartbeat_interval * Math.random());
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.lastHeartbeatAcked = true;
        this.latency = this.lastHeartbeat
          ? Date.now() - this.lastHeartbeat
          : Infinity;
        this.lastHeartbeat = Date.now();
        this.logger?.debug(
          `Shard ${this.id} => Connection Heartbeat`,
          `Recived Ack`
        );
        break;
      default:
        return this.logger?.debug(
          `Shard ${this.id} => Connection Message`,
          `Unhandled Event: ${payload.op} "${JSON.stringify(payload)}"`
        );
    }
  }

  heartbeat(ms?: number): any {
    if (ms && !this.heartbeatInterval) {
      return (this.heartbeatInterval = setInterval(() => this.heartbeat(), ms));
    } else if (!this.lastHeartbeatAcked && this.lastHeartbeat != null) {
      this.logger?.debug(
        `Shard ${this.id} => Hearbeat`,
        `Shard did not recieve an ack for the last heartbeat, Reconnecting`
      );
      return this.connection?.close(1000);
    }

    this.logger?.debug(`Shard ${this.id} => Heartbeat`, `Sending heartbeat`);
    this.lastHeartbeatAcked = false;
    return this.send(
      {
        op: GatewayOpcodes.Heartbeat,
        d: this.sequence,
      },
      true
    );
  }

  idenitfy() {
    this.status = ShardStatus.idenitying
    if (!this.sessionId) {
      const totalshards = this.manager.options.shardList
        ? Array.isArray(this.manager.options.shardList)
          ? this.manager.options.shardList?.length
          : 1
        : 1;
      return this.send(
        {
          op: GatewayOpcodes.Identify,
          d: {
            token: this.manager._token,
            intents: 547,
            properties: {
              os: /*process.platform*/ "Discord iOS",
              browser: "Discord iOS",
              device: "Discord iOS",
            },
            shard: [this.id, totalshards],
            presence: this.manager.options.presence,
          },
        },
        true
      );
    }

    return this.send(
      {
        op: GatewayOpcodes.Resume,
        d: {
          token: this.manager._token,
          session_id: this.sessionId,
          seq: this.resumeSequence ?? this.sequence,
        },
      },
      true
    );
  }

  send(data: GatewaySendPayload, urgent = false) {
    this.messageQueue.push(data, urgent);
    return this.messageQueue.process();
  }

  private async _send(data: GatewaySendPayload) {
    if (this.connection?.readyState != ws.OPEN) {
      this.logger?.debug(
        `Shard ${this.id} => Connection`,
        `Tried sending packet but no Connection was open`
      );
      setTimeout(() => {
        this.messageQueue.push(data, true);
        this.messageQueue.process();
      }, 1000 * 10);
      return;
    }

    this.logger?.debug(
      `Shard ${this.id} => Connection`,
      `Sending OPcode: ${data.op} to the Gateway`
    );

    return this.connection.send(JSON.stringify(data), (err) => {
      if (err) Promise.reject(err);
    });
  }
}

enum ShardStatus {
  ready,
  connecting,
  disconnected,
  reconnecting,
  connected,
  idenitying,
  resuming,
  idle,
}
