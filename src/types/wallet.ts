// types/wallet.ts
/**
 * Wallet-related type definitions
 */
import { PublicKey } from '@solana/web3.js';

export interface WalletBalance {
    usdc: number;
    sol: number;
    lastUpdated: Date;
}

export interface WalletState {
    address: string | null;
    connected: boolean;
    balance: WalletBalance | null;
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