# Polymarket AI Resolution System

A proof-of-concept for replacing Polymarket's capital-weighted oracle voting with neutral, evidence-based AI resolution.

## The Problem with Current Resolution

Polymarket uses UMA's optimistic oracle for market resolution. While functional, this system has structural flaws that prioritize capital power over objective truth:

### 1. Resolution by Inertia
If a proposed resolution isn't challenged within a short window, it becomes truth by default. This creates a system where the "default truth" depends on constant vigilance rather than evidence.

### 2. Cost Barriers to Dispute
Challenging a resolution requires a $750 bond. This friction prevents smaller participants from correcting false resolutions, even when they have evidence.

### 3. Capital-Weighted Voting
The final dispute resolution is decided by UMA token holders based on token weight, not evidence weight. A single wallet with sufficient tokens can determine outcomes regardless of facts.

### The Result
Markets are settled by whoever can "win the process" (the voting game), not whoever can "prove the outcome" with data. Resolution becomes a function of capital, not truth.

## This Solution

This system replaces the entire resolution mechanism with AI-driven, evidence-based resolution:

| Aspect | UMA Oracle | AI Resolution |
|--------|------------|---------------|
| **Decision Maker** | Token-weighted voters | Neutral AI agent |
| **Evidence** | Optional, not binding | Required, cited in reasoning |
| **Transparency** | Vote counts only | Full reasoning + sources |
| **Cost to Challenge** | $750 bond | None |
| **Speed** | Hours to days | Seconds |
| **Bias Vector** | Whale accumulation | None (rule-bound) |

### Key Properties

**Neutral**: No token holdings, no financial interest in outcomes. The AI follows market rules as written.

**Evidence-Based**: Uses real-time web search to gather data from authoritative sources. Decisions cite specific evidence.

**Auditable**: Every resolution produces a complete memo with reasoning, sources, and confidence score. Anyone can verify the logic.

**Rule-Bound**: Market rules are injected into the system prompt. The AI cannot deviate from stated resolution criteria.

## Architecture

```
                                    ┌─────────────────┐
                                    │   OpenRouter    │
                                    │   + Web Search  │
                                    └────────┬────────┘
                                             │
┌─────────────────┐    ┌─────────────────┐   │   ┌─────────────────┐
│    Scheduler    │───▶│ Resolution Svc  │───┴──▶│  AI Resolver    │
│  (Polls closed  │    │  (Orchestrator) │       │  (Grok + Search)│
│   markets)      │    └────────┬────────┘       └────────┬────────┘
└─────────────────┘             │                         │
                                │                         ▼
┌─────────────────┐             │              ┌─────────────────┐
│ Market Provider │◀────────────┘              │submit_resolution│
│  (Market data)  │                            │   (Tool call)   │
└─────────────────┘                            └─────────────────┘
```

## How It Works

1. **Market closes** → Scheduler detects it needs resolution
2. **Fetch market data** → Question, rules, allowed outcomes, primary sources
3. **Generate dynamic prompt** → Inject market-specific context into system prompt
4. **AI searches for evidence** → OpenRouter web plugin queries authoritative sources
5. **AI reasons through rules** → Evaluates evidence against resolution criteria
6. **Tool call submission** → AI must call `submit_resolution` with outcome, reasoning, sources, confidence
7. **Audit record created** → Full resolution memo stored with processing metadata

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3000
SCHEDULER_INTERVAL_MS=30000
AI_MODEL=x-ai/grok-4.1-fast
CONFIDENCE_THRESHOLD=0.6
```

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `PORT` | Server port | `3000` |
| `SCHEDULER_INTERVAL_MS` | Polling interval for closed markets | `30000` |
| `AI_MODEL` | Model via OpenRouter (must support tool calling) | `xai/grok-4.1-fast` |
| `CONFIDENCE_THRESHOLD` | Minimum confidence; below converts to UNKNOWN | `0.6` |

## Usage

```bash
bun run dev    # Development with hot reload
bun run start  # Production
```

### Trigger Resolution

```bash
curl -X POST http://localhost:3000/trigger/market-trump-2024-election
```

### Check Result

```bash
curl http://localhost:3000/resolution/market-trump-2024-election
```

## Example Resolution Output

```json
{
  "marketId": "market-trump-2024-election",
  "outcome": "YES",
  "reasoning": "Based on official sources, Donald Trump won the 2024 Presidential Election with 312 electoral votes, certified by Congress on January 6, 2025. The National Archives Electoral College page confirms this result. Associated Press and Reuters also reported the certified outcome.",
  "sources": [
    {
      "url": "https://www.archives.gov/electoral-college/2024",
      "title": "2024 Electoral College Results",
      "relevance": "Official federal government source for electoral vote certification"
    },
    {
      "url": "https://apnews.com/article/trump-wins-2024-election",
      "title": "AP News: Trump Wins 2024 Election",
      "relevance": "Primary news source confirming election results"
    }
  ],
  "confidence": 0.98,
  "resolvedAt": "2026-01-04T22:50:00.000Z",
  "processingTimeMs": 8432,
  "modelUsed": "x-ai/grok-4.1-fast"
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health, scheduler status, resolution stats |
| `GET` | `/markets` | List all markets |
| `GET` | `/market/:id` | Get market details including rules |
| `POST` | `/markets` | Create a new market |
| `POST` | `/trigger/:marketId` | Trigger AI resolution for a market |
| `POST` | `/resolve` | Submit resolution (internal, for tool call) |
| `GET` | `/resolutions` | List all completed resolutions |
| `GET` | `/resolution/:marketId` | Get resolution details |

## Resolution Outcomes

| Outcome | Definition |
|---------|------------|
| `YES` | Resolution criteria conclusively satisfied by evidence |
| `NO` | Resolution criteria conclusively not satisfied |
| `UNKNOWN` | Evidence ambiguous, missing, or conflicting |
| `EARLY` | Market closed before event could logically occur |

## Demo Markets

| ID | Question | Status |
|----|----------|--------|
| `market-trump-2024-election` | Will Donald Trump win the 2024 US Presidential Election? | CLOSED |
| `market-btc-100k-jan-2026` | Will Bitcoin reach $100,000 by January 31, 2026? | ACTIVE |
| `market-fed-rate-cut-jan-2026` | Will the Fed cut rates at January 2026 FOMC? | ACTIVE |
| `market-superbowl-lix-chiefs` | Will the Chiefs win Super Bowl LIX? | ACTIVE |

## Project Structure

```
src/
├── index.ts                 # Entry point
├── config.ts                # Environment validation
├── logger.ts                # Structured logging
├── api/
│   └── routes.ts            # HTTP endpoints
├── ai/
│   ├── prompt-generator.ts  # Dynamic system prompt construction
│   ├── resolver.ts          # OpenRouter client with web search
│   └── tools.ts             # submit_resolution tool schema
├── events/
│   └── event-bus.ts         # Internal pub/sub
├── providers/
│   ├── market-provider.ts   # Interface for market data
│   └── in-memory-market-provider.ts
├── resolution/
│   ├── service.ts           # Resolution orchestration
│   └── store.ts             # Resolution storage
├── scheduler/
│   └── resolution-scheduler.ts
└── types/
    ├── market.ts            # Market and resolution schemas
    └── events.ts            # Event definitions
```

## Production Considerations

This is a proof of concept. Production deployment requires:

1. **Persistent Storage**: Replace in-memory store with PostgreSQL
2. **Message Queue**: Replace polling scheduler with Kafka/RabbitMQ
3. **Multi-Model Consensus**: Query multiple AI models, require agreement
4. **Authentication**: Secure resolution submission endpoints
5. **Rate Limiting**: Prevent API abuse
6. **Retry Logic**: Handle transient API failures
7. **Monitoring**: Integrate observability stack

## License

MIT
