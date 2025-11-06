// types/models.ts
/**
 * AI Model-related type definitions
 */

export type ModelProvider = 'openai' | 'google' | 'anthropic';
export type ModelCapability = 'text' | 'image' | 'reasoning' | 'analysis' | 'vision';

export interface ModelPricing {
    baseRequest: number;
    perToken: {
        input: number;
        output: number;
    };
    maxRequest: number;
}

export interface ModelLimits {
    maxTokens: number;
    contextWindow: number;
    rateLimit: number;
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider;
    version: string;
    description: string;
    capabilities: ModelCapability[];
    pricing: ModelPricing;
    limits: ModelLimits;
    available: boolean;
    deprecated?: boolean;
}

export interface ModelResponse {
    success: boolean;
    models: ModelConfig[];
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}

export interface ModelCallOptions {
    model: string;
    message: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface ModelCallResult {
    text: string;
    tokens: {
        input: number;
        output: number;
    };
    model: string;
    finishReason: string;
}