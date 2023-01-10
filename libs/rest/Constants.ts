export interface CreateRestOptions {
    token: string;
    maxRetryCount?: number;
}

export type RequestMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const API_VERION = 10
export const USER_AGENT = `Mr Poll (v0.1, https://github.com/Drxckzyz/idk)`
export enum Urls {
    BASE_URL = "https://discord.com/api"
}

export interface File {
    name: string;

    data: string | number | boolean | Buffer;
}