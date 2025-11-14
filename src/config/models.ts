// src/app/config/models.ts

// config/models.ts
/**
 * AI Model Configurations
 * Defines available models, pricing, and limits
 */
import { ModelConfig, ModelCapability } from '@/types/models';

export const MODELS: ModelConfig[] = [
    // OpenAI Models
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        version: 'gpt-4o-2024-11-20',
        description: 'Most capable GPT-4 model, great for complex tasks',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 128000,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_OPENAI_ENABLED === 'true' || true
    },
    {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        version: 'gpt-4-turbo-2024-04-09',
        description: 'Faster GPT-4 with lower cost',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 128000,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_OPENAI_ENABLED === 'true' || true
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        version: 'gpt-3.5-turbo',
        description: 'Fast and affordable for simple tasks',
        capabilities: ['text'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 16385,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_OPENAI_ENABLED === 'true' || true
    },

    // Google Gemini Models
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        version: 'gemini-2.0-flash',
        description: 'Fast and efficient multimodal model',
        capabilities: ['text', 'vision', 'image'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 32768,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_GEMINI_ENABLED === 'true' || true
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        version: '1.5-pro',
        description: 'Advanced multimodal model with large context',
        capabilities: ['text', 'vision', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 1000000,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_GEMINI_ENABLED === 'true' || true
    },

    // Anthropic Claude Models
    {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        version: 'claude-3-5-sonnet-20241022',
        description: 'Balanced performance and speed',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 200000,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_CLAUDE_ENABLED === 'true' || true
    },
    {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        version: 'claude-3-opus-20240229',
        description: 'Most capable Claude model for complex tasks',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 200000,
            rateLimit: 10000,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_CLAUDE_ENABLED === 'true' || true
    },

    // Image Generation Models
    {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai',
        version: 'dall-e-3',
        description: 'Advanced image generation model',
        capabilities: ['image'],
        pricing: {
            baseRequest: 0.0001,
            perToken: {
                input: 0.000001,
                output: 0.000001,
            },
            maxRequest: 0.0005,
        },
        limits: {
            maxTokens: 0,
            contextWindow: 0,
            rateLimit: 50,
        },
        available: true,
        enabled: process.env.NEXT_PUBLIC_OPENAI_ENABLED === 'true' || true
    },
];

/**
 * Get model configuration by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
    return MODELS.find(model => model.id === id);
}

/**
 * Get all available models
 */
export function getAvailableModels(): ModelConfig[] {
    return MODELS.filter(model => model.available && !model.deprecated);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelConfig[] {
    return MODELS.filter(
        model => model.provider === provider && model.available && !model.deprecated
    );
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability: ModelCapability): ModelConfig[] {
    return MODELS.filter(
        model =>
            model.capabilities.includes(capability) &&
            model.available &&
            !model.deprecated
    );
}

/**
 * Default model ID
 */
export const DEFAULT_MODEL_ID = 'gpt-3.5-turbo';

/**
 * Get default model
 */
export function getDefaultModel(): ModelConfig {
    return getModelById(DEFAULT_MODEL_ID) || MODELS[0];
}