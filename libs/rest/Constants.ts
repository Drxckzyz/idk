export interface CreateRestOptions {
    token: string;
    customUrl?: string;
    maxRetryCount?: number;
    secretKey?: string;
}

export type RestManagerOptions = Omit<CreateRestOptions, "customUrl"> | Omit<CreateRestOptions, "secretKey">;
export type RequestMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const API_VERION = 9
export const USER_AGENT = `Mr Poll (v0.1, https://github.com/Drxckzyz/idk)`
export enum Urls {
    BASE_URL = "https://discord.com/api"
}

export interface File {
    name: string;

    data: string | number | boolean | Buffer;
}