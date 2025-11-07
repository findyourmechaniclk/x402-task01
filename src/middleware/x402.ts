// src/middleware/x402.ts - Fixed X402 middleware using official packages
import { NextRequest, NextResponse } from 'next/server';
import { createFacilitatorConfig } from '@coinbase/x402';
import { paymentMiddleware } from 'x402-next';
import { getModelById } from '@/config/models';
import type { SolanaAddress } from 'x402-next';

/**
 * Create X402 payment middleware for specific routes
 * This uses the official Coinbase X402 implementation
 */
export function createX402Middleware() {
    // Get Solana wallet address for payments
    const recipientWallet = process.env.X402_RECIPIENT_WALLET;
    if (!recipientWallet) {
        throw new Error('X402_RECIPIENT_WALLET environment variable is required');
    }

    // Configure payment middleware with Solana network
    return paymentMiddleware(
        recipientWallet as SolanaAddress,
        {
            '/api/chat': {
                price: '$0.01', // Fixed price for chat requests
                network: 'solana-devnet', // Use devnet for testing
                config: {
                    description: 'AI Chat Request',
                    mimeType: 'application/json'
                }
            },
            '/api/models': {
                price: '$0.001', // Cheaper for model listing
                network: 'solana-devnet',
                config: {
                    description: 'Get Available AI Models',
                    mimeType: 'application/json'
                }
            }
        },
        // Use default facilitator (x402.org for testnet)
        undefined,
        {
            // Optional paywall configuration
            appLogo: '/favicon.ico',
            appName: 'Solana X402 GPT'
        }
    );
}

/**
 * Manual payment verification for custom implementations
 * This is a fallback if you need custom logic
 */
export async function verifyX402Payment(request: NextRequest): Promise<{
    verified: boolean;
    error?: string;
    amount?: number;
}> {
    try {
        // Extract X402 headers
        const challenge = request.headers.get('X-402-Challenge');
        const signature = request.headers.get('X-402-Signature');
        const walletAddress = request.headers.get('X-402-Address');

        if (!challenge || !signature || !walletAddress) {
            return {
                verified: false,
                error: 'Missing X402 payment headers'
            };
        }

        // For now, we'll let the official middleware handle verification
        // In a custom implementation, you would verify the signature here
        return {
            verified: true,
            amount: 0.01
        };

    } catch (error) {
        console.error('X402 verification error:', error);
        return {
            verified: false,
            error: 'Payment verification failed'
        };
    }
}

/**
 * Calculate dynamic pricing based on model and request
 */
export function calculateRequestPrice(model: string, messageLength: number): string {
    const modelConfig = getModelById(model);
    if (!modelConfig) {
        return '$0.01'; // Default price
    }

    // Calculate estimated cost
    const inputTokens = Math.ceil(messageLength / 4);
    const outputTokens = 100; // Estimated
    const cost = modelConfig.pricing.baseRequest +
        (inputTokens * modelConfig.pricing.perToken.input) +
        (outputTokens * modelConfig.pricing.perToken.output);

    // Convert to dollar format for X402
    return `$${Math.max(0.001, cost).toFixed(3)}`;
}

/**
 * Create payment required response for manual implementations
 */
export function createPaymentRequiredResponse(
    challenge: string,
    amount: string,
    description: string = 'Payment required for AI request'
): NextResponse {
    return NextResponse.json(
        {
            error: 'payment_required',
            message: 'Payment required for this request',
            payment: {
                challenge,
                amount,
                currency: 'USDC',
                network: 'solana-devnet',
                description
            }
        },
        {
            status: 402,
            headers: {
                'X-402-Challenge': challenge,
                'X-402-Price': amount.replace('$', ''),
                'X-402-Currency': 'USDC',
                'X-402-Network': 'solana-devnet'
            }
        }
    );
}