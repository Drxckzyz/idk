type messageCallBack = (...args: any[]) => string;

export const makeError = <T extends string>(base: ErrorConstructor, messages: Record<string, string | messageCallBack>) => class Error extends base {
    public override stack?: string | undefined;
    public code: T;
    public constructor(key: T, ...args: any[]) {
        const message = messages[key]
        if (!message) throw new TypeError(`Inavlid error key given`)
        super(typeof message === "string" ? message : message(...args));

        Error.captureStackTrace(this)
        this.code = key
    }

    public override get name(): string {
        return `${super.name} [${this.name}]`
    }
}