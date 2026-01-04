import type {
    SystemEvent,
    MarketClosedEvent,
    ResolutionStartedEvent,
    ResolutionCompletedEvent,
    ResolutionFailedEvent,
} from "../types";

type EventTypeMap = {
    MARKET_CLOSED: MarketClosedEvent;
    RESOLUTION_STARTED: ResolutionStartedEvent;
    RESOLUTION_COMPLETED: ResolutionCompletedEvent;
    RESOLUTION_FAILED: ResolutionFailedEvent;
};

type EventHandler<T extends SystemEvent> = (event: T) => void | Promise<void>;

class EventBus {
    private handlers: Map<SystemEvent["type"], Set<EventHandler<SystemEvent>>> =
        new Map();

    subscribe<K extends keyof EventTypeMap>(
        eventType: K,
        handler: EventHandler<EventTypeMap[K]>
    ): () => void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }

        this.handlers
            .get(eventType)!
            .add(handler as EventHandler<SystemEvent>);

        return () => {
            this.handlers
                .get(eventType)
                ?.delete(handler as EventHandler<SystemEvent>);
        };
    }

    async emit<T extends SystemEvent>(event: T): Promise<void> {
        const handlers = this.handlers.get(event.type);
        if (!handlers) return;

        const promises = Array.from(handlers).map((handler) => {
            try {
                return Promise.resolve(handler(event));
            } catch (error) {
                console.error(`Error in event handler for ${event.type}:`, error);
                return Promise.resolve();
            }
        });

        await Promise.all(promises);
    }

    clear(): void {
        this.handlers.clear();
    }
}

export const eventBus = new EventBus();
