import type { Market } from "../types";
import type { MarketProvider } from "./market-provider";

const DEMO_MARKETS: Market[] = [
    {
        id: "market-trump-2024-election",
        question: "Will Donald Trump win the 2024 US Presidential Election?",
        description:
            "This market resolves to YES if Donald Trump wins the 2024 United States Presidential Election.",
        category: "Politics",
        createdAt: "2024-01-01T00:00:00Z",
        closeTime: "2024-11-05T23:59:59Z",
        resolutionDeadline: "2024-12-20T23:59:59Z",
        status: "CLOSED",
        rules: {
            description:
                "Resolution is based on the official certification of electoral votes by the United States Congress.",
            resolutionCriteria:
                "The market resolves YES if Donald Trump is certified as the winner of the 2024 Presidential Election by the United States Congress, receiving at least 270 electoral votes. The market resolves NO if any other candidate wins.",
            primarySources: [
                "https://www.archives.gov/electoral-college",
                "https://www.congress.gov",
                "https://apnews.com",
                "https://www.reuters.com",
            ],
            edgeCases: [
                "If the election outcome is contested and goes to the House of Representatives, the final House decision determines resolution.",
                "Recounts do not affect resolution unless they change the certified winner.",
                "The market resolves based on certification, not projected winners on election night.",
            ],
        },
        allowedOutcomes: ["YES", "NO", "UNKNOWN", "EARLY"],
    },
    {
        id: "market-btc-100k-jan-2026",
        question: "Will Bitcoin reach $100,000 by January 31, 2026?",
        description:
            "This market resolves to YES if the price of Bitcoin (BTC) reaches or exceeds $100,000 USD at any point before the resolution deadline.",
        category: "Crypto",
        createdAt: "2025-12-01T00:00:00Z",
        closeTime: "2026-01-31T23:59:59Z",
        resolutionDeadline: "2026-02-02T23:59:59Z",
        status: "ACTIVE",
        rules: {
            description:
                "Resolution is based on the spot price of BTC/USD on major exchanges.",
            resolutionCriteria:
                "The market resolves YES if Bitcoin's spot price reaches or exceeds $100,000 USD on any of the following exchanges: Coinbase, Binance, or Kraken. The price must be sustained for at least 1 minute as shown on the exchange's official price feed. Screenshots or archived data from these exchanges will be considered valid evidence.",
            primarySources: [
                "https://www.coinbase.com",
                "https://www.binance.com",
                "https://www.kraken.com",
                "https://coinmarketcap.com",
                "https://www.coingecko.com",
            ],
            edgeCases: [
                "If an exchange experiences a flash crash or flash spike that is later reversed or marked as erroneous, that price will not count.",
                "If all listed exchanges are unavailable, CoinMarketCap or CoinGecko aggregate price will be used.",
                "Price must be from spot markets, not futures or derivatives.",
            ],
        },
        allowedOutcomes: ["YES", "NO", "UNKNOWN", "EARLY"],
    },
    {
        id: "market-fed-rate-cut-jan-2026",
        question:
            "Will the Federal Reserve cut interest rates at the January 2026 FOMC meeting?",
        description:
            "This market resolves to YES if the Federal Reserve announces a reduction in the federal funds target rate at the January 2026 FOMC meeting.",
        category: "Economics",
        createdAt: "2025-12-15T00:00:00Z",
        closeTime: "2026-01-29T19:00:00Z",
        resolutionDeadline: "2026-01-30T23:59:59Z",
        status: "ACTIVE",
        rules: {
            description:
                "Resolution is based on the official FOMC statement released after the January 2026 meeting.",
            resolutionCriteria:
                "The market resolves YES if the Federal Reserve announces any reduction (of any size) to the federal funds target rate range. A rate cut of 25 basis points, 50 basis points, or any other reduction qualifies. The market resolves NO if the rate is held steady or increased.",
            primarySources: [
                "https://www.federalreserve.gov",
                "https://www.reuters.com",
                "https://www.bloomberg.com",
            ],
            edgeCases: [
                "Emergency rate decisions made before the scheduled meeting date count only if they explicitly replace the January decision.",
                "If the meeting is postponed, resolution will be based on the rescheduled meeting.",
                "Technical corrections or clarifications to the rate announcement do not change the resolution.",
            ],
        },
        allowedOutcomes: ["YES", "NO", "UNKNOWN", "EARLY"],
    },
    {
        id: "market-superbowl-lix-chiefs",
        question: "Will the Kansas City Chiefs win Super Bowl LIX?",
        description:
            "This market resolves to YES if the Kansas City Chiefs win Super Bowl LIX.",
        category: "Sports",
        createdAt: "2025-09-01T00:00:00Z",
        closeTime: "2026-02-09T23:30:00Z",
        resolutionDeadline: "2026-02-10T23:59:59Z",
        status: "ACTIVE",
        rules: {
            description:
                "Resolution is based on the official result of Super Bowl LIX.",
            resolutionCriteria:
                "The market resolves YES if the Kansas City Chiefs are declared the official winner of Super Bowl LIX by the National Football League (NFL). The market resolves NO if any other team wins or if the Chiefs do not participate in the Super Bowl.",
            primarySources: [
                "https://www.nfl.com",
                "https://www.espn.com",
                "https://www.cbssports.com",
            ],
            edgeCases: [
                "If the game is cancelled and not rescheduled, the market resolves UNKNOWN.",
                "If the result is overturned due to rule violations after the game, the final NFL official ruling will be used.",
                "Overtime victories count as a valid win.",
            ],
        },
        allowedOutcomes: ["YES", "NO", "UNKNOWN", "EARLY"],
    },
];

export class InMemoryMarketProvider implements MarketProvider {
    private markets: Map<string, Market> = new Map();

    constructor() {
        DEMO_MARKETS.forEach((market) => {
            this.markets.set(market.id, market);
        });
    }

    async getMarket(id: string): Promise<Market | null> {
        return this.markets.get(id) ?? null;
    }

    async getClosedMarkets(): Promise<Market[]> {
        const now = new Date();
        return Array.from(this.markets.values()).filter((market) => {
            const closeTime = new Date(market.closeTime);
            return closeTime <= now && market.status === "ACTIVE";
        });
    }

    async getUnresolvedMarkets(): Promise<Market[]> {
        return Array.from(this.markets.values()).filter(
            (market) => market.status === "CLOSED" || market.status === "ACTIVE"
        );
    }

    async updateMarketStatus(
        id: string,
        status: Market["status"]
    ): Promise<void> {
        const market = this.markets.get(id);
        if (market) {
            this.markets.set(id, { ...market, status });
        }
    }

    addMarket(market: Market): void {
        this.markets.set(market.id, market);
    }

    getAllMarkets(): Market[] {
        return Array.from(this.markets.values());
    }
}
