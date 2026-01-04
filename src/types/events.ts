import type { Market, ResolutionRecord } from "./market";

export interface MarketClosedEvent {
    type: "MARKET_CLOSED";
    market: Market;
    timestamp: string;
}

export interface ResolutionStartedEvent {
    type: "RESOLUTION_STARTED";
    marketId: string;
    timestamp: string;
}

export interface ResolutionCompletedEvent {
    type: "RESOLUTION_COMPLETED";
    resolution: ResolutionRecord;
    timestamp: string;
}

export interface ResolutionFailedEvent {
    type: "RESOLUTION_FAILED";
    marketId: string;
    error: string;
    timestamp: string;
}

export type SystemEvent =
    | MarketClosedEvent
    | ResolutionStartedEvent
    | ResolutionCompletedEvent
    | ResolutionFailedEvent;
