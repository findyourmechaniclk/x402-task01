// src/lib/x402/protocol.ts
import { X402Challenge, X402PaymentData } from '@/types/x402';
import { PaymentVerification } from '@/types/payment';
import { verifyTransactionOnChain } from '../wallet/solana';
import { PublicKey } from '@solana/web3.js';
import { getModelById } from '@/config/models';

const X402_MIN_PAYMENT = Number(`${process.env.X402_MIN_PAYMENT}` || '0.01'); // Minimum 0.01 USDC
const CHALLENGE_EXPIRY_MINUTES = 5;
const challengeStore = new Map<string, X402Challenge>();

/**
 * Generate a unique nonce using Web Crypto API (Edge runtime compatible)
 */
export function generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a salt using Web Crypto API
 */
export function generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

    challengeStore.set(nonce, challenge);
    cleanupExpiredChallenges();

    console.log('🎯 Created payment challenge:', { nonce, amount, recipient: recipientAddress });
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
 * Verify payment signature (simplified for development)
 */
export function verifyPaymentSignature(
    challenge: string,
    signature: string,
    walletAddress: string
): boolean {
    try {
        console.log('🔍 Verifying signature for challenge:', challenge);

        const storedChallenge = getChallenge(challenge);
        if (!storedChallenge) {
            console.error('❌ Challenge not found or expired');
            return false;
        }

        try {
            new PublicKey(walletAddress);
        } catch {
            console.error('❌ Invalid wallet address format');
            return false;
        }

        // For development: accept any non-empty signature
        // In production, implement proper Ed25519 signature verification
        const isValid = signature.length > 0 && walletAddress.length > 0;
        console.log(isValid ? '✅ Signature verification passed' : '❌ Signature verification failed');
        return isValid;
    } catch (error) {
        console.error('❌ Signature verification error:', error);
        return false;
    }
}

/**
 * Verify payment transaction on blockchain
 */
export async function verifyPaymentTransaction(
    transactionHash: string,
    expectedAmount: number,     // decimal USDC (e.g., 0.01)
    recipientAddress: string,   // merchant wallet
    senderAddress: string       // (optional) you can ignore or enhance to check funding account
): Promise<PaymentVerification> {
    try {
        console.log('🔍 Verifying payment transaction:', transactionHash);

        const usdcMint = `${process.env.NEXT_PUBLIC_USDC_MINT}`;
        const usdcDecimals = Number(process.env.NEXT_PUBLIC_USDC_DECIMALS || '6');
        const expectedAmountAtomic = BigInt(Math.round(expectedAmount * 10 ** usdcDecimals));

        const ok = await verifyTransactionOnChain({
            signature: transactionHash,
            expectedRecipient: recipientAddress,
            expectedMint: usdcMint,
            expectedAmount: expectedAmountAtomic,
            commitment: 'confirmed',
        });

        if (!ok) {
            return {
                success: false,
                verified: false,
                transactionHash,
                amount: 0,
                balance: 0,
                timestamp: new Date().toISOString(),
                error: {
                    code: 'TRANSACTION_NOT_CONFIRMED',
                    message: 'Transaction not found, failed, or does not match mint/recipient/amount',
                },
            };
        }

        console.log('✅ Payment transaction verified');
        return {
            success: true,
            verified: true,
            transactionHash,
            amount: expectedAmount,
            balance: expectedAmount,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('❌ Payment verification error:', error);
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
 * Calculate cost for a model request using actual model configuration
 */
export function calculateRequestCost(
    model: string,
    messageLength: number
): number {
    const estimatedTokens = Math.ceil(messageLength / 4);

    // Get actual model configuration
    const modelConfig = getModelById(model);

    if (!modelConfig) {
        console.warn(`Model ${model} not found, using default pricing`);
        return 0.01; // fallback
    }

    // Use actual model pricing from config
    const cost = modelConfig.pricing.baseRequest +
        (estimatedTokens * modelConfig.pricing.perToken.input);

    console.log("Allowed minimum payment : " + X402_MIN_PAYMENT)

    const finalCost = Math.max(X402_MIN_PAYMENT, Math.round(cost * 100000) / 100000); // Support smaller amounts

    console.log(`💰 Cost calculation for ${model}: ${estimatedTokens} tokens = ${finalCost} USDC`);
    return finalCost;
}

/**
 * Validation functions
 */
export function isValidChallenge(challenge: string): boolean {
    return /^[a-f0-9]{32,}$/i.test(challenge);
}

export function isValidSignature(signature: string): boolean {
    return /^[a-f0-9]{64,}$/i.test(signature);
}

export function isValidAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Create standardized message for signing
 */
export function createSignatureMessage(challenge: string, walletAddress: string): string {
    return `X402 Payment Authorization\nChallenge: ${challenge}\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
}

/**
 * Create 402 Payment Required response
 */
export function createPaymentRequiredResponse(
    challenge: string,
    amount: number,
    recipient: string,
    expiresAt: string,
    message: string = 'Payment required for this request'
): Response {
    const headers = {
        'X-402-Challenge': challenge,
        'X-402-Price': amount.toString(),
        'X-402-Currency': 'USDC',
        'X-402-Recipient': recipient,
        'X-402-Expiry': expiresAt,
        'Content-Type': 'application/json',
    };

    const body = {
        error: 'payment_required',
        message,
        payment: {
            challenge,
            amount,
            currency: 'USDC',
            recipient,
            expiresAt,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 402,
        headers,
    });
}

/**
 * Get challenge statistics for monitoring
 */
export function getChallengeStats(): {
    active: number;
    expired: number;
    total: number;
} {
    const now = new Date();
    let active = 0;
    let expired = 0;

    for (const [, challenge] of challengeStore.entries()) {
        if (now > challenge.expiresAt) {
            expired++;
        } else {
            active++;
        }
    }

    return {
        active,
        expired,
        total: challengeStore.size,
    };
}

/**
 * Clear all challenges (for testing)
 */
export function clearAllChallenges(): void {
    challengeStore.clear();
    console.log('🧹 All challenges cleared');
}