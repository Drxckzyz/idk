export interface QueueItem<T = void> {
    cb: () => Promise<T>;
    resolve: (item: T) => void;
    reject: (reason?: any) => void;
}

export class Queue<T = void> {
    private readonly items: QueueItem<T>[] = [];
    private processing = false

    public run(cb: () => Promise<T>, urgent = false) {
        return new Promise<T>((resolve, reject) => {
            this.items[urgent ? 'unshift' : 'push']({ cb, resolve, reject })
            this.process();
        })
    }

    private process() {
        if (this.processing) return;

        const item = this.items.shift();
        if (!item) {
            this.processing = false
            return
        }

        this.processing = true
        void item.cb()
            .then((data) => item.resolve(data))
            .catch((err) => item.reject(err))
            .finally(() => {
                this.processing = false
                this.process()
            })
    }
}