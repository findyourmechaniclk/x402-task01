// src/types/chat.ts
/**
 * Chat-related type definitions
 */

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'image';

export interface Message {
    id: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    model: string;
    tokens?: {
        input: number;
        output: number;
    };
    cost: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
    type?: MessageType;      // default to 'text'
    imageUrl?: string;       // used when type === 'image'
}

export interface Conversation {
    id: string;
    walletAddress: string;
    title: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
    messages: Message[];
    totalCost: number;
    messageCount: number;
}

export interface ChatRequest {
    message: string;
    model: string;
    conversationId?: string;
    stream?: boolean;
    systemPrompt?: string;
}

export interface ChatResponse {
    success: boolean;
    response: string;
    cost: {
        amount: number;
        currency: 'USDC';
        tokens: {
            input: number;
            output: number;
        };
    };
    transactionHash?: string;
    timestamp: string;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}

export type StreamMessageType = 'token' | 'done' | 'error';

export interface StreamMessage {
    type: StreamMessageType;
    content?: string;
    cost?: number;
    error?: string;
}