// config/constants.ts
/**
 * Application Constants
 * Centralized configuration values
 */

// API Configuration
export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
} as const;

// Solana Configuration
export const SOLANA_CONFIG = {
    NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    COMMITMENT: 'confirmed' as const,
    CONFIRM_TIMEOUT: 60000, // 60 seconds
} as const;

// Network Configurations
export const NETWORK_CONFIGS = {
    'mainnet-beta': {
        name: 'mainnet-beta' as const,
        rpcUrl: 'https://api.mainnet-beta.solana.com',
    },
    'devnet': {
        name: 'devnet' as const,
        rpcUrl: 'https://api.devnet.solana.com',
    },
    'testnet': {
        name: 'testnet' as const,
        rpcUrl: 'https://api.testnet.solana.com',
    },
    'localnet': {
        name: 'localnet' as const,
        rpcUrl: 'http://localhost:8899',
    },
} as const;

// USDC Mint addresses for different networks
export const USDC_MINT_ADDRESSES = {
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    'testnet': 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp',
    'localnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
} as const;

// X402 Protocol Configuration
export const X402_CONFIG = {
    CHALLENGE_EXPIRY_MINUTES: 5,
    DEFAULT_CURRENCY: 'USDC',
    RECIPIENT_ADDRESS: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || '',
    MIN_PAYMENT_AMOUNT: 0.01, // Minimum 0.01 USDC
    MAX_PAYMENT_AMOUNT: 1.0, // Maximum 1.0 USDC per request
} as const;

// Payment Configuration
export const PAYMENT_CONFIG = {
    CURRENCY: 'USDC',
    DECIMALS: 6,
    MIN_BALANCE_WARNING: 0.1, // Warn when balance below 0.1 USDC
    AUTO_REFRESH_INTERVAL: 30000, // Refresh balance every 30 seconds
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
    MAX_MESSAGE_LENGTH: 4000,
    MAX_HISTORY_MESSAGES: 50,
    DEFAULT_SYSTEM_PROMPT: 'You are a helpful AI assistant.',
    STREAM_ENABLED: true,
} as const;

// UI Configuration
export const UI_CONFIG = {
    WALLET_ADDRESS_DISPLAY_LENGTH: 4,
    TOAST_DURATION: 5000, // 5 seconds
    DEBOUNCE_DELAY: 300, // 300ms
    ANIMATION_DURATION: 200, // 200ms
} as const;

// Storage Keys
export const STORAGE_KEYS = {
    WALLET_CONNECTED: 'walletConnected',
    WALLET_ADDRESS: 'walletAddress',
    CONVERSATIONS: 'x402_conversations',
    CURRENT_CONVERSATION: 'x402_current_conversation',
    THEME: 'theme',
    PREFERRED_MODEL: 'preferredModel',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    WALLET_NOT_INSTALLED: 'Phantom wallet not found. Please install the Phantom browser extension.',
    WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',
    INSUFFICIENT_BALANCE: 'Insufficient USDC balance for this transaction.',
    TRANSACTION_FAILED: 'Transaction failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    INVALID_INPUT: 'Invalid input. Please check your message.',
    PAYMENT_REQUIRED: 'Payment required to access this resource.',
    CHALLENGE_EXPIRED: 'Payment challenge expired. Please try again.',
    API_KEY_MISSING: 'API key not configured. Please contact support.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    WALLET_CONNECTED: 'Wallet connected successfully!',
    WALLET_DISCONNECTED: 'Wallet disconnected.',
    PAYMENT_SUCCESSFUL: 'Payment successful!',
    MESSAGE_SENT: 'Message sent successfully.',
    BALANCE_REFRESHED: 'Balance refreshed.',
} as const;

// Model Provider API Endpoints
export const MODEL_ENDPOINTS = {
    OPENAI: 'https://api.openai.com/v1',
    GOOGLE: 'https://generativelanguage.googleapis.com/v1beta',
    ANTHROPIC: 'https://api.anthropic.com/v1',
} as const;

// Rate Limits
export const RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
    REQUESTS_PER_DAY: 10000,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
    ENABLE_STREAMING: true,
    ENABLE_IMAGE_GENERATION: true,
    ENABLE_CONVERSATION_HISTORY: true,
    ENABLE_COST_TRACKING: true,
    ENABLE_ANALYTICS: false,
    MOCK_PAYMENTS: process.env.NEXT_PUBLIC_MOCK_PAYMENTS === 'true',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
    MIN_MESSAGE_LENGTH: 1,
    MAX_MESSAGE_LENGTH: 4000,
    MIN_WALLET_ADDRESS_LENGTH: 32,
    MAX_WALLET_ADDRESS_LENGTH: 44,
    CHALLENGE_LENGTH: 64,
    SIGNATURE_LENGTH: 128,
} as const;

// Time Constants
export const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

// Environment Check
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_SERVER = typeof window === 'undefined';
export const IS_CLIENT = typeof window !== 'undefined';