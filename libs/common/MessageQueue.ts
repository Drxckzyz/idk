import { sleep } from ".";

export class MessageQueue<T = any> {
    private readonly messages: Array<T> = [];
    private processing = false
    private limit: number;
    private options: MessageQueueOptions<T>;
    private resetTime: number;
    private lastMessageProcessed: number;
    private lastReset: number;
    constructor(options: MessageQueueOptions<T>) {
        this.limit = options.limit
        this.options = options
        this.resetTime = options.resetTime
        this.lastMessageProcessed = 0;
        this.lastReset = 0;
        setInterval(() => {
            this.limit = this.options.limit
            this.lastReset = Date.now()
        }, this.resetTime)
    }

    push(message: T, urgent = false) {
        return this.messages[urgent ? 'unshift' : 'push'](message)
    }

    async process(): Promise<any> {
        if (this.processing) return
        if (this.limit === 0) {
            await sleep(Date.now() - this.lastReset)
            return this.process()
        } else if (Date.now() - this.lastMessageProcessed < 1000 * 2) {
            await sleep(Date.now() - this.lastMessageProcessed)
            return this.process()
        }

        this.processing = true
        const message = this.messages.shift()
        if (!message) {
            this.processing = false
            return
        }
        this.options.sendFunction(message)
        this.processing = false
        if (this.messages.length) return this.process()
        else return
    }
}

interface MessageQueueOptions<T = any> {
    limit: number;
    resetTime: number;
    sendFunction: (data: T) => void;
}