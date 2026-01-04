type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    data?: Record<string, unknown>;
}

class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            data,
        };

        const dataStr = data ? ` ${JSON.stringify(data)}` : "";
        console.log(
            `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${message}${dataStr}`
        );
    }

    debug(message: string, data?: Record<string, unknown>) {
        this.log("DEBUG", message, data);
    }

    info(message: string, data?: Record<string, unknown>) {
        this.log("INFO", message, data);
    }

    warn(message: string, data?: Record<string, unknown>) {
        this.log("WARN", message, data);
    }

    error(message: string, data?: Record<string, unknown>) {
        this.log("ERROR", message, data);
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context);
}
