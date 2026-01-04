import { z } from "zod";

export const ResolutionOutcomeSchema = z.enum(["YES", "NO", "UNKNOWN", "EARLY"]);
export type ResolutionOutcome = z.infer<typeof ResolutionOutcomeSchema>;

export const MarketStatusSchema = z.enum([
    "ACTIVE",
    "CLOSED",
    "RESOLVING",
    "RESOLVED",
]);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

export const MarketRulesSchema = z.object({
    description: z.string(),
    resolutionCriteria: z.string(),
    primarySources: z.array(z.string()),
    edgeCases: z.array(z.string()),
});
export type MarketRules = z.infer<typeof MarketRulesSchema>;

export const MarketSchema = z.object({
    id: z.string(),
    question: z.string(),
    description: z.string(),
    category: z.string(),
    createdAt: z.string().datetime(),
    closeTime: z.string().datetime(),
    resolutionDeadline: z.string().datetime(),
    status: MarketStatusSchema,
    rules: MarketRulesSchema,
    allowedOutcomes: z.array(ResolutionOutcomeSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Market = z.infer<typeof MarketSchema>;

export const ResolutionSubmissionSchema = z.object({
    marketId: z.string(),
    outcome: ResolutionOutcomeSchema,
    reasoning: z.string(),
    sources: z.array(
        z.object({
            url: z.string(),
            title: z.string(),
            relevance: z.string(),
        })
    ),
    confidence: z.number().min(0).max(1),
    resolvedAt: z.string().datetime(),
});
export type ResolutionSubmission = z.infer<typeof ResolutionSubmissionSchema>;

export const ResolutionRecordSchema = ResolutionSubmissionSchema.extend({
    id: z.string(),
    processingTimeMs: z.number(),
    modelUsed: z.string(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
});
export type ResolutionRecord = z.infer<typeof ResolutionRecordSchema>;
