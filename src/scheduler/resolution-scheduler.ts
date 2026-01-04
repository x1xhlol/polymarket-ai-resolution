import { eventBus } from "../events";
import { createLogger } from "../logger";
import type { MarketProvider } from "../providers";
import type { ResolutionService } from "../resolution";
import type { MarketClosedEvent } from "../types";

const log = createLogger("Scheduler");

export interface SchedulerStatus {
    running: boolean;
    intervalMs: number;
    lastCheckTime: string | null;
    checksPerformed: number;
}

export class ResolutionScheduler {
    private readonly marketProvider: MarketProvider;
    private readonly resolutionService: ResolutionService;
    private readonly checkIntervalMs: number;
    private intervalId: Timer | null = null;
    private lastCheckTime: string | null = null;
    private checksPerformed = 0;

    constructor(
        marketProvider: MarketProvider,
        resolutionService: ResolutionService,
        checkIntervalMs = 30000
    ) {
        this.marketProvider = marketProvider;
        this.resolutionService = resolutionService;
        this.checkIntervalMs = checkIntervalMs;
    }

    start(): void {
        if (this.intervalId) {
            log.warn("Scheduler already running");
            return;
        }

        log.info("Starting resolution scheduler", {
            intervalMs: this.checkIntervalMs,
        });

        this.intervalId = setInterval(() => {
            this.checkForClosedMarkets();
        }, this.checkIntervalMs);

        this.checkForClosedMarkets();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            log.info("Scheduler stopped");
        }
    }

    private async checkForClosedMarkets(): Promise<void> {
        this.lastCheckTime = new Date().toISOString();
        this.checksPerformed++;

        try {
            const closedMarkets = await this.marketProvider.getClosedMarkets();

            for (const market of closedMarkets) {
                const alreadyResolved = this.resolutionService.getStore().exists(market.id);

                if (alreadyResolved) {
                    continue;
                }

                if (this.resolutionService.isProcessing(market.id)) {
                    continue;
                }

                log.info("Detected closed market requiring resolution", {
                    marketId: market.id,
                    question: market.question,
                });

                await eventBus.emit<MarketClosedEvent>({
                    type: "MARKET_CLOSED",
                    market,
                    timestamp: new Date().toISOString(),
                });

                this.resolutionService.resolveMarket(market.id).catch((error) => {
                    log.error("Failed to resolve market", {
                        marketId: market.id,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                });
            }
        } catch (error) {
            log.error("Error checking for closed markets", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    isRunning(): boolean {
        return this.intervalId !== null;
    }

    getStatus(): SchedulerStatus {
        return {
            running: this.isRunning(),
            intervalMs: this.checkIntervalMs,
            lastCheckTime: this.lastCheckTime,
            checksPerformed: this.checksPerformed,
        };
    }
}
