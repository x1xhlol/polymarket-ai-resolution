import type { Market, ResolutionSubmission } from "../types";

export interface AIResolverConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
    maxWebResults: number;
    temperature: number;
    maxTokens: number;
}

export interface ResolverResult {
    submission: ResolutionSubmission;
    modelUsed: string;
    promptTokens?: number;
    completionTokens?: number;
}

export interface Resolver {
    resolve(market: Market): Promise<ResolverResult>;
}

export const DEFAULT_RESOLVER_CONFIG: Omit<AIResolverConfig, "apiKey"> = {
    model: "x-ai/grok-4.1-fast",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    maxWebResults: 10,
    temperature: 0.4,
    maxTokens: 4096,
};
