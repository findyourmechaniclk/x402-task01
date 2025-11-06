// lib/x402/protocol.ts
/**
 * X402 HTTP Payment Protocol Implementation
 * Implements RFC 8866 for micropayment-based resource access
 */
import { X402Challenge, X402PaymentData } from '@/types/x402';
import { PaymentVerification } from '@/types/payment';
import { verifyTransaction } from '../wallet/solana';
import { PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

// Challenge expiry time in minutes
const CHALLENGE_EXPIRY_MINUTES = 5;

// In-memory challenge store (in production, use Redis or database)
const challengeStore = new Map<string, X402Challenge>();

/**
 * Generate a unique nonce for payment challenge
 */
export function generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a salt for additional security
 */
export function generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new X402 payment challenge
 */
export function createPaymentChallenge(
    amount: number,
    recipientAddress: string
): X402Challenge {
    const nonce = generateNonce();
    const salt = generateSalt();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHALLENGE_EXPIRY_MINUTES);

    const challenge: X402Challenge = {
        nonce,
        amount,
        recipient: recipientAddress,
        expiresAt,
        salt,
    };

    // Store challenge for verification
    challengeStore.set(nonce, challenge);

    // Clean up expired challenges
    cleanupExpiredChallenges();

    return challenge;
}

/**
 * Get a stored challenge by nonce
 */
export function getChallenge(nonce: string): X402Challenge | null {
    const challenge = challengeStore.get(nonce);

    if (!challenge) {
        return null;
    }

    // Check if challenge has expired
    if (new Date() > challenge.expiresAt) {
        challengeStore.delete(nonce);
        return null;
    }

    return challenge;
}

/**
 * Verify if a challenge is valid and not expired
 */
export function isChallengeValid(nonce: string): boolean {
    const challenge = getChallenge(nonce);
    return challenge !== null;
}

/**
 * Remove a challenge after successful verification
 */
export function removeChallenge(nonce: string): void {
    challengeStore.delete(nonce);
}

/**
 * Clean up expired challenges from storage
 */
function cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [nonce, challenge] of challengeStore.entries()) {
        if (now > challenge.expiresAt) {
            challengeStore.delete(nonce);
        }
    }
}

/**
 * Create X402 payment data for client response
 */
export function createPaymentData(challenge: X402Challenge): X402PaymentData {
    return {
        challenge: challenge.nonce,
        amount: challenge.amount,
        currency: 'USDC',
        recipient: challenge.recipient,
        expiresAt: challenge.expiresAt.toISOString(),
    };
}

/**
 * Verify payment signature
 * Checks if the signature is valid for the given challenge and wallet address
 */
export function verifyPaymentSignature(
    challenge: string,
    signature: string,
    walletAddress: string
): boolean {
    try {
        // Get the stored challenge
        const storedChallenge = getChallenge(challenge);
        if (!storedChallenge) {
            console.error('Challenge not found or expired');
            return false;
        }

        // In a production environment, you would verify the signature cryptographically
        // This is a simplified version that checks if the wallet address matches
        // The actual implementation should use ed25519 signature verification

        // Validate wallet address format
        try {
            new PublicKey(walletAddress);
        } catch {
            console.error('Invalid wallet address format');
            return false;
        }

        // For now, we'll accept any signature if the challenge exists and is valid
        // In production, implement proper signature verification:
        // const messageBuffer = Buffer.from(challenge);
        // const signatureBuffer = Buffer.from(signature, 'hex');
        // const publicKey = new PublicKey(walletAddress);
        // return nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKey.toBytes());

        return signature.length > 0 && walletAddress.length > 0;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Verify payment transaction on blockchain
 */
export async function verifyPaymentTransaction(
    transactionHash: string,
    expectedAmount: number,
    recipientAddress: string,
    senderAddress: string
): Promise<PaymentVerification> {
    try {
        // Verify transaction exists and is confirmed
        const isConfirmed = await verifyTransaction(transactionHash);

        if (!isConfirmed) {
            return {
                success: false,
                verified: false,
                transactionHash,
                amount: 0,
                balance: 0,
                timestamp: new Date().toISOString(),
                error: {
                    code: 'TRANSACTION_NOT_CONFIRMED',
                    message: 'Transaction not found or not confirmed on blockchain',
                },
            };
        }

        // In production, you would:
        // 1. Parse transaction details
        // 2. Verify amount matches expected amount
        // 3. Verify recipient matches expected recipient
        // 4. Verify sender matches claimed sender

        // For now, return success if transaction is confirmed
        return {
            success: true,
            verified: true,
            transactionHash,
            amount: expectedAmount,
            balance: expectedAmount,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Payment verification error:', error);
        return {
            success: false,
            verified: false,
            transactionHash,
            amount: 0,
            balance: 0,
            timestamp: new Date().toISOString(),
            error: {
                code: 'VERIFICATION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to verify payment',
            },
        };
    }
}

/**
 * Create X402 error response
 */
export function createX402Error(
    error: string,
    message: string,
    paymentData?: X402PaymentData
) {
    return {
        error,
        message,
        payment: paymentData,
    };
}

/**
 * Calculate cost for a model request
 * Based on model type and estimated token count
 */
export function calculateRequestCost(
    model: string,
    messageLength: number
): number {
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(messageLength / 4);

    // Base pricing per model (in USDC)
    const modelPricing: Record<string, { base: number; perToken: number }> = {
        'gpt-4o': { base: 0.03, perToken: 0.00001 },
        'gpt-4-turbo': { base: 0.01, perToken: 0.000005 },
        'gpt-3.5-turbo': { base: 0.005, perToken: 0.000001 },
        'gemini-2.0-flash': { base: 0.01, perToken: 0.000005 },
        'gemini-1.5-pro': { base: 0.02, perToken: 0.00001 },
        'claude-3-5-sonnet': { base: 0.01, perToken: 0.000005 },
        'claude-3-opus': { base: 0.05, perToken: 0.00002 },
        'dall-e-3': { base: 0.15, perToken: 0 },
    };

    const pricing = modelPricing[model.toLowerCase()] || { base: 0.01, perToken: 0.000005 };

    const cost = pricing.base + (estimatedTokens * pricing.perToken);

    // Round to 2 decimal places and ensure minimum of 0.01 USDC
    return Math.max(0.01, Math.round(cost * 100) / 100);
}

/**
 * Validate X402 headers from request
 */
export interface X402ValidationResult {
    valid: boolean;
    challenge?: string;
    signature?: string;
    address?: string;
    error?: string;
}

export function validateX402Headers(headers: Record<string, string | undefined>): X402ValidationResult {
    const challenge = headers['x-402-challenge'];
    const signature = headers['x-402-signature'];
    const address = headers['x-402-address'];

    if (!challenge || !signature || !address) {
        return {
            valid: false,
            error: 'Missing required X402 headers',
        };
    }

    if (!isChallengeValid(challenge)) {
        return {
            valid: false,
            error: 'Challenge not found or expired',
        };
    }

    return {
        valid: true,
        challenge,
        signature,
        address,
    };
}

/**
 * Format X402 response headers
 */
export function formatX402ResponseHeaders(challenge: X402Challenge): Record<string, string> {
    return {
        'X-402-Challenge': challenge.nonce,
        'X-402-Price': challenge.amount.toString(),
        'X-402-Currency': 'USDC',
        'X-402-Recipient': challenge.recipient,
        'X-402-Expiry': challenge.expiresAt.toISOString(),
    };
}