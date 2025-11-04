// src/config/models.ts
import { ModelConfig } from '@/types';

export const MODELS: Record<string, ModelConfig> = {
    'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4 Optimized',
        provider: 'openai',
        version: '2024-08-06',
        description: 'Most capable GPT-4 model, optimized for chat and reasoning tasks',
        capabilities: ['text', 'reasoning', 'vision'],
        pricing: {
            baseRequest: 0.01,
            perToken: {
                input: 0.0000025,
                output: 0.00001,
            },
            maxRequest: 0.15,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 128000,
            rateLimit: 60,
        },
        available: true,
    },
    'gpt-4-turbo': {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        version: '2024-04-09',
        description: 'Fast and efficient GPT-4 model for general tasks',
        capabilities: ['text', 'reasoning'],
        pricing: {
            baseRequest: 0.01,
            perToken: {
                input: 0.00001,
                output: 0.00003,
            },
            maxRequest: 0.10,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 128000,
            rateLimit: 60,
        },
        available: true,
    },
    'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        version: '0125',
        description: 'Fast and affordable model for simple tasks',
        capabilities: ['text'],
        pricing: {
            baseRequest: 0.01,
            perToken: {
                input: 0.0000005,
                output: 0.0000015,
            },
            maxRequest: 0.05,
        },
        limits: {
            maxTokens: 4096,
            contextWindow: 16385,
            rateLimit: 100,
        },
        available: true,
    },
    'gemini-2.0-flash-exp': {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        version: '2.0',
        description: 'Latest Gemini model with multimodal capabilities',
        capabilities: ['text', 'image', 'vision', 'reasoning'],
        pricing: {
            baseRequest: 0.01,
            perToken: {
                input: 0.000001,
                output: 0.000004,
            },
            maxRequest: 0.08,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 1000000,
            rateLimit: 100,
        },
        available: true,
    },
    'gemini-1.5-pro': {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        version: '1.5',
        description: 'Powerful Gemini model with large context window',
        capabilities: ['text', 'image', 'vision', 'analysis'],
        pricing: {
            baseRequest: 0.01,
            perToken: {
                input: 0.00000125,
                output: 0.000005,
            },
            maxRequest: 0.10,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 2000000,
            rateLimit: 60,
        },
        available: true,
    },
    'claude-3-5-sonnet': {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        version: '20241022',
        description: 'Most intelligent Claude model for complex tasks',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
            baseRequest: 0.02,
            perToken: {
                input: 0.000003,
                output: 0.000015,
            },
            maxRequest: 0.12,
        },
        limits: {
            maxTokens: 8192,
            contextWindow: 200000,
            rateLimit: 50,
        },
        available: false,
    },
};

export const DEFAULT_MODEL = 'gpt-4o';

export const getAvailableModels = (): ModelConfig[] => {
    return Object.values(MODELS).filter(model => model.available);
};

export const getModelById = (id: string): ModelConfig | undefined => {
    return MODELS[id];
};

export const getModelsByProvider = (provider: string): ModelConfig[] => {
    return Object.values(MODELS).filter(
        model => model.provider === provider && model.available
    );
};