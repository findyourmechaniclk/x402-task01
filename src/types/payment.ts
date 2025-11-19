// src/types/payment.ts
/**
 * Payment-related type definitions
 */

export interface PaymentChallenge {
    nonce: string;
    amount: number;
    recipient: string;
    expiresAt: Date;
    salt?: string;
}

export interface PaymentRequest {
    walletAddress: string;
    transactionHash: string;
    amount: number;
    challenge: string;
    signature?: string;
}

export interface PaymentVerification {
    success: boolean;
    verified: boolean;
    transactionHash: string;
    amount: number;
    balance: number;
    timestamp: string;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}

export type TransactionType = 'chat' | 'image' | 'other';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

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