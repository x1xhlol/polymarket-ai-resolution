export class ResolutionError extends Error {
    constructor(
        message: string,
        public readonly code: ResolutionErrorCode,
        public readonly marketId?: string
    ) {
        super(message);
        this.name = "ResolutionError";
    }
}

export type ResolutionErrorCode =
    | "MARKET_NOT_FOUND"
    | "ALREADY_RESOLVED"
    | "ALREADY_PROCESSING"
    | "AI_NO_TOOL_CALL"
    | "AI_API_ERROR"
    | "INVALID_RESPONSE"
    | "CONFIDENCE_TOO_LOW";
