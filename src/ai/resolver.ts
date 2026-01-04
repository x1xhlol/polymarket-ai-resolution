import type { Market, ResolutionSubmission } from "../types";
import { ResolutionError } from "../errors";
import { generateSystemPrompt, generateUserPrompt } from "./prompt-generator";
import { RESOLUTION_TOOLS, type SubmitResolutionParams } from "./tools";
import {
    type Resolver,
    type ResolverResult,
    type AIResolverConfig,
    DEFAULT_RESOLVER_CONFIG,
} from "./types";
import { ResolutionOutcomeSchema } from "../types";

interface OpenRouterResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string | null;
            tool_calls?: Array<{
                id: string;
                type: string;
                function: {
                    name: string;
                    arguments: string;
                };
            }>;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class AIResolver implements Resolver {
    private readonly config: AIResolverConfig;

    constructor(config: Partial<AIResolverConfig> & { apiKey: string }) {
        this.config = {
            ...DEFAULT_RESOLVER_CONFIG,
            ...config,
        };
    }

    async resolve(market: Market): Promise<ResolverResult> {
        const systemPrompt = generateSystemPrompt(market);
        const userPrompt = generateUserPrompt(market);

        const response = await this.callOpenRouter(systemPrompt, userPrompt);

        const toolCall = this.extractToolCall(response);
        if (!toolCall) {
            throw new ResolutionError(
                "AI did not call submit_resolution tool",
                "AI_NO_TOOL_CALL",
                market.id
            );
        }

        const params = this.parseToolCallArguments(toolCall.function.arguments);
        const submission = this.createSubmission(market.id, params);

        return {
            submission,
            modelUsed: this.config.model,
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
        };
    }

    private async callOpenRouter(
        systemPrompt: string,
        userPrompt: string
    ): Promise<OpenRouterResponse> {
        const response = await fetch(this.config.baseUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
                "X-Title": "Polymarket AI Resolution System",
            },
            body: JSON.stringify({
                model: `${this.config.model}:online`,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                tools: RESOLUTION_TOOLS,
                tool_choice: {
                    type: "function",
                    function: { name: "submit_resolution" },
                },
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                plugins: [
                    {
                        id: "web",
                        max_results: this.config.maxWebResults,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new ResolutionError(
                `OpenRouter API error: ${response.status} - ${errorBody}`,
                "AI_API_ERROR"
            );
        }

        return response.json();
    }

    private extractToolCall(response: OpenRouterResponse) {
        const message = response.choices[0]?.message;
        if (!message?.tool_calls?.length) {
            return null;
        }

        return (
            message.tool_calls.find((tc) => tc.function.name === "submit_resolution") ??
            null
        );
    }

    private parseToolCallArguments(args: string): SubmitResolutionParams {
        let parsed: unknown;
        try {
            parsed = JSON.parse(args);
        } catch {
            throw new ResolutionError(
                "Failed to parse tool call arguments",
                "INVALID_RESPONSE"
            );
        }

        const obj = parsed as Record<string, unknown>;
        const outcome = ResolutionOutcomeSchema.parse(obj.outcome);

        return {
            outcome,
            reasoning: String(obj.reasoning ?? ""),
            sources: Array.isArray(obj.sources) ? obj.sources : [],
            confidence: Math.max(0, Math.min(1, Number(obj.confidence) || 0)),
        };
    }

    private createSubmission(
        marketId: string,
        params: SubmitResolutionParams
    ): ResolutionSubmission {
        return {
            marketId,
            outcome: params.outcome,
            reasoning: params.reasoning,
            sources: params.sources,
            confidence: params.confidence,
            resolvedAt: new Date().toISOString(),
        };
    }
}
