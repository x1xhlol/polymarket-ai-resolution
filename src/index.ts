import { createApi } from "./api";
import { loadConfig } from "./config";
import { eventBus } from "./events";
import { createLogger } from "./logger";
import { AIResolver } from "./ai";
import { InMemoryMarketProvider } from "./providers";
import { ResolutionService } from "./resolution";
import { ResolutionScheduler } from "./scheduler";

const config = loadConfig();
const log = createLogger("Main");

const marketProvider = new InMemoryMarketProvider();

const resolver = new AIResolver({
    apiKey: config.OPENROUTER_API_KEY,
    model: config.AI_MODEL,
});

const resolutionService = new ResolutionService(resolver, marketProvider, {
    confidenceThreshold: config.CONFIDENCE_THRESHOLD,
});

const scheduler = new ResolutionScheduler(
    marketProvider,
    resolutionService,
    config.SCHEDULER_INTERVAL_MS
);

eventBus.subscribe("MARKET_CLOSED", (event) => {
    log.info("Market closed", {
        marketId: event.market.id,
        question: event.market.question,
    });
});

eventBus.subscribe("RESOLUTION_STARTED", (event) => {
    log.info("Resolution started", { marketId: event.marketId });
});

eventBus.subscribe("RESOLUTION_COMPLETED", (event) => {
    log.info("Resolution completed", {
        marketId: event.resolution.marketId,
        outcome: event.resolution.outcome,
        confidence: event.resolution.confidence,
        processingTimeMs: event.resolution.processingTimeMs,
    });
});

eventBus.subscribe("RESOLUTION_FAILED", (event) => {
    log.error("Resolution failed", {
        marketId: event.marketId,
        error: event.error,
    });
});

const app = createApi(marketProvider, resolutionService, scheduler);

scheduler.start();

log.info("Server started", {
    port: config.PORT,
    model: config.AI_MODEL,
    schedulerIntervalMs: config.SCHEDULER_INTERVAL_MS,
    confidenceThreshold: config.CONFIDENCE_THRESHOLD,
});

console.log(`
Polymarket AI Resolution System
================================
Server:     http://localhost:${config.PORT}
Model:      ${config.AI_MODEL}
Scheduler:  ${config.SCHEDULER_INTERVAL_MS / 1000}s interval
Threshold:  ${config.CONFIDENCE_THRESHOLD} minimum confidence

Endpoints:
  GET  /health              System health & status
  GET  /markets             List all markets
  GET  /market/:id          Get market details
  POST /markets             Create new market
  POST /trigger/:marketId   Trigger AI resolution
  POST /resolve             Submit resolution (internal)
  GET  /resolutions         List all resolutions
  GET  /resolution/:id      Get resolution details

Demo Markets:
  market-trump-2024-election   (CLOSED - ready to resolve)
  market-btc-100k-jan-2026     (ACTIVE)
  market-fed-rate-cut-jan-2026 (ACTIVE)
  market-superbowl-lix-chiefs  (ACTIVE)
`);

export default {
    port: config.PORT,
    fetch: app.fetch,
};
