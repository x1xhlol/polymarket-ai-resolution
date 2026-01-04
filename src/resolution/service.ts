import type { Market, ResolutionSubmission } from "../types";
import type { Resolver } from "../ai";
import { eventBus } from "../events";
import { ResolutionError } from "../errors";
import { createLogger } from "../logger";
import type { MarketProvider } from "../providers";
import { ResolutionStore } from "./store";

const log = createLogger("ResolutionService");

export interface ResolutionServiceConfig {
    confidenceThreshold: number;
}

export class ResolutionService {
    private readonly resolver: Resolver;
    private readonly store: ResolutionStore;
    private readonly marketProvider: MarketProvider;
    private readonly processingMarkets: Set<string> = new Set();
    private readonly config: ResolutionServiceConfig;

    constructor(
        resolver: Resolver,
        marketProvider: MarketProvider,
        config: Partial<ResolutionServiceConfig> = {}
    ) {
        this.resolver = resolver;
        this.store = new ResolutionStore();
        this.marketProvider = marketProvider;
        this.config = {
            confidenceThreshold: config.confidenceThreshold ?? 0.6,
        };
    }

    async resolveMarket(marketId: string): Promise<void> {
        if (this.processingMarkets.has(marketId)) {
            log.warn("Market already being processed", { marketId });
            return;
        }

        const market = await this.marketProvider.getMarket(marketId);
        if (!market) {
            throw new ResolutionError(
                `Market ${marketId} not found`,
                "MARKET_NOT_FOUND",
                marketId
            );
        }

        const existing = this.store.get(marketId);
        if (existing) {
            log.warn("Market already resolved", { marketId });
            return;
        }

        this.processingMarkets.add(marketId);

        await eventBus.emit({
            type: "RESOLUTION_STARTED",
            marketId,
            timestamp: new Date().toISOString(),
        });

        await this.marketProvider.updateMarketStatus(marketId, "RESOLVING");

        const startTime = Date.now();

        try {
            const result = await this.resolver.resolve(market);
            const processingTimeMs = Date.now() - startTime;

            const finalSubmission = this.applyConfidenceThreshold(
                result.submission,
                marketId
            );

            const record = await this.store.save(finalSubmission, {
                processingTimeMs,
                modelUsed: result.modelUsed,
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
            });

            await this.marketProvider.updateMarketStatus(marketId, "RESOLVED");

            log.info("Market resolved successfully", {
                marketId,
                outcome: record.outcome,
                confidence: record.confidence,
                processingTimeMs,
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            log.error("Resolution failed", { marketId, error: errorMessage });

            await eventBus.emit({
                type: "RESOLUTION_FAILED",
                marketId,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });

            await this.marketProvider.updateMarketStatus(marketId, "CLOSED");

            throw error;
        } finally {
            this.processingMarkets.delete(marketId);
        }
    }

    private applyConfidenceThreshold(
        submission: ResolutionSubmission,
        marketId: string
    ): ResolutionSubmission {
        if (
            submission.confidence < this.config.confidenceThreshold &&
            submission.outcome !== "UNKNOWN"
        ) {
            const originalOutcome = submission.outcome;

            log.warn("Confidence below threshold, converting to UNKNOWN", {
                marketId,
                originalOutcome,
                confidence: submission.confidence,
                threshold: this.config.confidenceThreshold,
            });

            return {
                ...submission,
                outcome: "UNKNOWN",
                reasoning: `[AUTO-CONVERTED: Original outcome was ${originalOutcome} with confidence ${submission.confidence}, below threshold of ${this.config.confidenceThreshold}]\n\n${submission.reasoning}`,
            };
        }

        return submission;
    }

    async resolveMarketFromData(market: Market): Promise<void> {
        return this.resolveMarket(market.id);
    }

    getStore(): ResolutionStore {
        return this.store;
    }

    isProcessing(marketId: string): boolean {
        return this.processingMarkets.has(marketId);
    }
}
