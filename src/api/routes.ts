import { Hono } from "hono";
import { ZodError } from "zod";
import { createLogger } from "../logger";
import type { InMemoryMarketProvider } from "../providers";
import type { ResolutionService } from "../resolution";
import type { ResolutionScheduler } from "../scheduler";
import { MarketSchema, ResolutionSubmissionSchema } from "../types";

const log = createLogger("API");

export function createApi(
    marketProvider: InMemoryMarketProvider,
    resolutionService: ResolutionService,
    scheduler?: ResolutionScheduler
) {
    const app = new Hono();
    const startTime = new Date().toISOString();

    app.use("*", async (c, next) => {
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        log.debug("Request completed", {
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            durationMs: duration,
        });
    });

    app.get("/health", (c) => {
        const resolutions = resolutionService.getStore().getAll();
        const lastResolution = resolutions[resolutions.length - 1];

        return c.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: startTime,
            scheduler: scheduler?.getStatus() ?? null,
            stats: {
                totalMarkets: marketProvider.getAllMarkets().length,
                totalResolutions: resolutions.length,
                lastResolution: lastResolution
                    ? {
                        marketId: lastResolution.marketId,
                        outcome: lastResolution.outcome,
                        resolvedAt: lastResolution.resolvedAt,
                    }
                    : null,
            },
        });
    });

    app.get("/market/:id", async (c) => {
        const id = c.req.param("id");
        const market = await marketProvider.getMarket(id);

        if (!market) {
            return c.json({ error: "Market not found" }, 404);
        }

        return c.json(market);
    });

    app.get("/markets", (c) => {
        const markets = marketProvider.getAllMarkets();
        return c.json({ markets, count: markets.length });
    });

    app.post("/markets", async (c) => {
        try {
            const body = await c.req.json();
            const market = MarketSchema.parse(body);
            marketProvider.addMarket(market);
            log.info("Market created", { marketId: market.id });
            return c.json({ success: true, market }, 201);
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json(
                    { error: "Invalid market data", details: error.issues },
                    400
                );
            }
            throw error;
        }
    });

    app.post("/resolve", async (c) => {
        try {
            const body = await c.req.json();
            const submission = ResolutionSubmissionSchema.parse(body);

            const existing = resolutionService.getStore().get(submission.marketId);
            if (existing) {
                return c.json({ error: "Market already resolved", existing }, 409);
            }

            const record = await resolutionService.getStore().save(submission, {
                processingTimeMs: 0,
                modelUsed: "external",
            });

            await marketProvider.updateMarketStatus(submission.marketId, "RESOLVED");

            log.info("External resolution submitted", {
                marketId: submission.marketId,
                outcome: submission.outcome,
            });

            return c.json({ success: true, resolution: record }, 201);
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json(
                    { error: "Invalid submission", details: error.issues },
                    400
                );
            }
            throw error;
        }
    });

    app.post("/trigger/:marketId", async (c) => {
        const marketId = c.req.param("marketId");

        const market = await marketProvider.getMarket(marketId);
        if (!market) {
            return c.json({ error: "Market not found" }, 404);
        }

        const existing = resolutionService.getStore().get(marketId);
        if (existing) {
            return c.json(
                { error: "Market already resolved", resolution: existing },
                409
            );
        }

        if (resolutionService.isProcessing(marketId)) {
            return c.json({ error: "Market resolution already in progress" }, 409);
        }

        log.info("Manual resolution triggered", { marketId });

        resolutionService.resolveMarket(marketId).catch((error) => {
            log.error("Resolution failed", {
                marketId,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        });

        return c.json({
            success: true,
            message: `Resolution triggered for market ${marketId}`,
            status: "processing",
        });
    });

    app.get("/resolutions", (c) => {
        const resolutions = resolutionService.getStore().getAll();
        return c.json({ resolutions, count: resolutions.length });
    });

    app.get("/resolution/:marketId", (c) => {
        const marketId = c.req.param("marketId");
        const resolution = resolutionService.getStore().get(marketId);

        if (!resolution) {
            return c.json({ error: "Resolution not found" }, 404);
        }

        return c.json(resolution);
    });

    return app;
}
