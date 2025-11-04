// src/config/constants.ts
import { NetworkConfig, SolanaNetwork } from '@/types';

export const NETWORK_CONFIGS: Record<SolanaNetwork, NetworkConfig> = {
    'mainnet-beta': {
        name: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        wsUrl: 'wss://api.mainnet-beta.solana.com',
    },
    devnet: {
        name: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        wsUrl: 'wss://api.devnet.solana.com',
    },
    testnet: {
        name: 'testnet',
        rpcUrl: 'https://api.testnet.solana.com',
        wsUrl: 'wss://api.testnet.solana.com',
    },
    localnet: {
        name: 'localnet',
        rpcUrl: 'http://127.0.0.1:8899',
        wsUrl: 'ws://127.0.0.1:8900',
    },
};

export const USDC_MINT_ADDRESSES: Record<SolanaNetwork, string> = {
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    devnet: 'Gh9ZwEmdLJ8DscKiYtn89JHU1MgCJ7Hb3v9GhE1jdFyN',
    testnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    localnet: '',
};

export const PAYMENT_CONFIG = {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 100,
    CHALLENGE_EXPIRY_MS: 5 * 60 * 1000,
    CONFIRMATION_TIMEOUT_MS: 30 * 1000,
    POLL_INTERVAL_MS: 2000,
    MIN_CONFIRMATIONS: 1,
    REQUIRED_CONFIRMATIONS: 6,
} as const;

export const RATE_LIMITS = {
    CHAT_REQUESTS_PER_HOUR: 60,
    MODEL_LIST_PER_MINUTE: 100,
    BALANCE_CHECK_PER_MINUTE: 200,
    TRANSACTION_HISTORY_PER_MINUTE: 30,
} as const;

export const UI_CONFIG = {
    MAX_MESSAGE_LENGTH: 4000,
    MESSAGE_PLACEHOLDER: 'Type your message...',
    LOADING_MESSAGES: [
        'Thinking...',
        'Processing...',
        'Generating response...',
    ],
    ERROR_DISPLAY_DURATION_MS: 5000,
} as const;

export const STORAGE_KEYS = {
    CONVERSATIONS: 'x402_conversations',
    CURRENT_CONVERSATION: 'x402_current_conversation',
    WALLET_ADDRESS: 'x402_wallet_address',
    PREFERENCES: 'x402_preferences',
} as const;

export const ERROR_CODES = {
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
    WALLET_DISCONNECTED: 'WALLET_DISCONNECTED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
    INVALID_MODEL: 'INVALID_MODEL',
    MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    API_KEY_INVALID: 'API_KEY_INVALID',
    INVALID_INPUT: 'INVALID_INPUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export const SUCCESS_MESSAGES = {
    WALLET_CONNECTED: 'Wallet connected successfully',
    WALLET_DISCONNECTED: 'Wallet disconnected',
    PAYMENT_CONFIRMED: 'Payment confirmed',
    MESSAGE_SENT: 'Message sent successfully',
} as const;

export const API_ENDPOINTS = {
    CHAT: '/api/chat',
    MODELS: '/api/models',
    PAYMENT_VERIFY: '/api/payment/verify',
    PAYMENT_STATUS: '/api/payment/status',
    WALLET_INFO: '/api/wallet/info',
    WALLET_BALANCE: '/api/wallet/balance',
} as const;

export const FEATURES = {
    ENABLE_STREAMING: true,
    ENABLE_IMAGE_GENERATION: false,
    ENABLE_VOICE_INPUT: false,
    ENABLE_EXPORT_CHAT: true,
    ENABLE_DARK_MODE: true,
} as const;

export const TIMEOUTS = {
    API_REQUEST: 30000,
    WALLET_CONNECTION: 10000,
    TRANSACTION_CONFIRMATION: 30000,
    MODEL_RESPONSE: 60000,
} as const;