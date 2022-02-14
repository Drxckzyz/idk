export interface CreateRestOptions {
    token: string;
    customUrl?: string;
    maxRetryCount?: number;
    secretKey?: string;
}

export type RestManagerOptions = Omit<CreateRestOptions, "customUrl"> | Omit<CreateRestOptions, "secretKey">;