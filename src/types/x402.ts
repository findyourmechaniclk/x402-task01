// types/x402.ts
/**
 * X402 Protocol type definitions
 */

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