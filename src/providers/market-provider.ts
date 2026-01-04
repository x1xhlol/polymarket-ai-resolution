import type { Market } from "../types";

export interface MarketProvider {
    getMarket(id: string): Promise<Market | null>;
    getClosedMarkets(): Promise<Market[]>;
    getUnresolvedMarkets(): Promise<Market[]>;
    updateMarketStatus(id: string, status: Market["status"]): Promise<void>;
}
