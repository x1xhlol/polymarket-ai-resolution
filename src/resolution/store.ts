import type { ResolutionRecord, ResolutionSubmission } from "../types";
import { eventBus } from "../events";

interface ResolutionMetadata {
    processingTimeMs: number;
    modelUsed: string;
    promptTokens?: number;
    completionTokens?: number;
}

export class ResolutionStore {
    private readonly resolutions: Map<string, ResolutionRecord> = new Map();

    async save(
        submission: ResolutionSubmission,
        metadata: ResolutionMetadata
    ): Promise<ResolutionRecord> {
        const record: ResolutionRecord = {
            ...submission,
            id: `res-${submission.marketId}-${Date.now()}`,
            processingTimeMs: metadata.processingTimeMs,
            modelUsed: metadata.modelUsed,
            promptTokens: metadata.promptTokens,
            completionTokens: metadata.completionTokens,
        };

        this.resolutions.set(submission.marketId, record);

        await eventBus.emit({
            type: "RESOLUTION_COMPLETED",
            resolution: record,
            timestamp: new Date().toISOString(),
        });

        return record;
    }

    get(marketId: string): ResolutionRecord | null {
        return this.resolutions.get(marketId) ?? null;
    }

    getAll(): ResolutionRecord[] {
        return Array.from(this.resolutions.values());
    }

    exists(marketId: string): boolean {
        return this.resolutions.has(marketId);
    }
}
