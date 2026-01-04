import type { ResolutionOutcome } from "../types";

export interface SubmitResolutionParams {
    outcome: ResolutionOutcome;
    reasoning: string;
    sources: Array<{
        url: string;
        title: string;
        relevance: string;
    }>;
    confidence: number;
}

export const SUBMIT_RESOLUTION_TOOL = {
    type: "function" as const,
    function: {
        name: "submit_resolution",
        description:
            "Submit the final resolution decision for a prediction market. This tool must be called exactly once after gathering evidence and reaching a conclusion.",
        parameters: {
            type: "object",
            properties: {
                outcome: {
                    type: "string",
                    enum: ["YES", "NO", "UNKNOWN", "EARLY"],
                    description:
                        "The resolution outcome. YES if criteria are conclusively met, NO if conclusively not met, UNKNOWN if ambiguous or insufficient evidence, EARLY if market closed before event could occur.",
                },
                reasoning: {
                    type: "string",
                    description:
                        "Detailed explanation of the reasoning process, including what evidence was found, how it relates to the resolution criteria, and why this outcome was chosen. This should be comprehensive enough for audit purposes.",
                },
                sources: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "The URL of the source",
                            },
                            title: {
                                type: "string",
                                description: "The title or name of the source",
                            },
                            relevance: {
                                type: "string",
                                description: "How this source is relevant to the resolution",
                            },
                        },
                        required: ["url", "title", "relevance"],
                    },
                    description:
                        "List of sources consulted to reach this decision. Include all relevant sources even if they provided conflicting information.",
                },
                confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description:
                        "Confidence score from 0 to 1 indicating how certain the resolution is. 1.0 = absolute certainty with clear evidence, 0.5 = moderate confidence, below 0.5 should typically result in UNKNOWN outcome.",
                },
            },
            required: ["outcome", "reasoning", "sources", "confidence"],
        },
    },
};

export const RESOLUTION_TOOLS = [SUBMIT_RESOLUTION_TOOL];
