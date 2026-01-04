import { z } from "zod";

const envSchema = z.object({
    OPENROUTER_API_KEY: z.string().min(1, "OpenRouter API key is required"),
    PORT: z.string().default("3000").transform(Number),
    SCHEDULER_INTERVAL_MS: z.string().default("30000").transform(Number),
    AI_MODEL: z.string().default("x-ai/grok-4.1-fast"),
    CONFIDENCE_THRESHOLD: z.string().default("0.6").transform(Number),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("Invalid environment configuration:");
        result.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
        process.exit(1);
    }

    return result.data;
}
