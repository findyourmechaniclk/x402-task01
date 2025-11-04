// src/types/index.ts
import { PublicKey } from '@solana/web3.js';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'error';

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
    status: MessageStatus;
    error?: string;
    metadata?: Record<string, unknown>;
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
    error?: ApiError;
}

export interface StreamMessage {
    type: 'token' | 'done' | 'error';
    content?: string;
    cost?: number;
    error?: string;
}

export interface PaymentChallenge {
    nonce: string;
    amount: number;
    recipient: string;
    expiresAt: Date;
    salt?: string;
    model: string;
}

export interface PaymentRequest {
    walletAddress: string;
    transactionHash: string;
    amount: number;
    challenge: string;
    signature: string;
}

export interface PaymentVerification {
    success: boolean;
    verified: boolean;
    transactionHash: string;
    amount: number;
    balance: number;
    timestamp: string;
    error?: ApiError;
}

export type TransactionType = 'chat' | 'image' | 'other';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'timeout';

export interface Transaction {
    id: string;
    walletAddress: string;
    hash: string;
    amount: number;
    type: TransactionType;
    model?: string;
    status: TransactionStatus;
    confirmations: number;
    timestamp: Date;
}

export interface WalletBalance {
    usdc: number;
    sol: number;
    lastUpdated: Date;
}

export interface WalletState {
    address: string | null;
    connected: boolean;
    loading: boolean;
    error: string | null;
}

export interface WalletInfo {
    address: string;
    balance: WalletBalance;
    totalSpent: number;
    requestCount: number;
    firstSeen: Date;
    lastActive: Date;
}

export interface ConnectWalletResponse {
    success: boolean;
    address?: string;
    error?: string;
}

export interface DisconnectWalletResponse {
    success: boolean;
}

export interface SignMessageRequest {
    message: Uint8Array;
}

export interface SignMessageResponse {
    signature: Uint8Array;
    publicKey: PublicKey;
}

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
    error?: ApiError;
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

export interface X402Headers {
    'X-402-Challenge'?: string;
    'X-402-Signature'?: string;
    'X-402-Address'?: string;
    'X-402-Payment-Required'?: string;
    'X-402-Price'?: string;
    'X-402-Currency'?: string;
    'X-402-Recipient'?: string;
    'X-402-Expiry'?: string;
    'X-402-Validated'?: string;
    'X-402-Transaction'?: string;
}

export interface X402Challenge {
    nonce: string;
    amount: number;
    recipient: string;
    expiresAt: Date;
    salt: string;
}

export interface X402PaymentData {
    challenge: string;
    amount: number;
    currency: string;
    recipient: string;
    expiresAt: string;
}

export interface X402Error {
    error: string;
    message: string;
    payment?: X402PaymentData;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface PaginatedResponse<T> {
    success: boolean;
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}

export interface ChatInterfaceProps {
    model?: string;
    onModelChange?: (model: string) => void;
    onCostChange?: (cost: number) => void;
}

export interface WalletButtonProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary';
    onConnect?: (address: string) => void;
    onDisconnect?: () => void;
}

export interface MessageListProps {
    messages: Message[];
    loading?: boolean;
    onRetry?: (messageId: string) => void;
}

export interface InputAreaProps {
    disabled?: boolean;
    placeholder?: string;
    maxLength?: number;
    onSend: (message: string) => Promise<void>;
    onCancel?: () => void;
}

export interface ModelSelectorProps {
    selectedModel: string;
    models: ModelConfig[];
    onSelect: (modelId: string) => void;
    disabled?: boolean;
}

export interface CostDisplayProps {
    message: string;
    model: string;
    estimatedCost: number;
    currentBalance: number;
}

export interface StorageData {
    conversations: Record<string, Conversation>;
    currentConversationId: string | null;
    walletAddress: string | null;
}

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface NetworkConfig {
    name: SolanaNetwork;
    rpcUrl: string;
    wsUrl?: string;
}