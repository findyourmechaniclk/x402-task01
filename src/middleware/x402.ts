// src/middleware/x402.ts
import { NextRequest, NextResponse } from 'next/server';
import { X402 } from '@coinbase/x402';
import { verifySignature } from 'x402-next';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { getWalletBalances, verifyTransaction } from '@/lib/wallet/solana';
import { getModelById } from '@/config/models';

// Initialize X402 with environment configuration
const x402 = new X402({
    recipient: process.env.X402_RECIPIENT_WALLET!,
    currency: 'USDC',
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK as any
});

/**
 * X402 Payment Middleware
 * Uses official @coinbase/x402 and x402-next for payment verification
 */
export async function x402PaymentMiddleware(
    request: NextRequest
): Promise<NextResponse | null> {
    try {
        // Parse request body to get model and message for cost calculation
        const requestClone = request.clone();
        const body = await requestClone.json();
        const { model, message } = body;

        if (!model || !message) {
            return NextResponse.json(
                { error: 'INVALID_REQUEST', message: 'Model and message are required' },
                { status: 400 }
            );
        }

        // Calculate cost based on model and message length
        const modelConfig = getModelById(model);
        if (!modelConfig) {
            return NextResponse.json(
                { error: 'MODEL_NOT_FOUND', message: `Model '${model}' not found` },
                { status: 404 }
            );
        }

        // Calculate cost (rough estimation: 1 token ≈ 4 characters)
        const inputTokens = Math.ceil(message.length / 4);
        const outputTokens = 100; // Estimated output
        const cost = modelConfig.pricing.baseRequest +
            (inputTokens * modelConfig.pricing.perToken.input) +
            (outputTokens * modelConfig.pricing.perToken.output);

        // Extract X402 headers
        const challenge = request.headers.get('X-402-Challenge');
        const signature = request.headers.get('X-402-Signature');
        const walletAddress = request.headers.get('X-402-Address');

        // If no payment headers, generate challenge and return 402
        if (!challenge || !signature || !walletAddress) {
            const paymentChallenge = x402.createChallenge({
                amount: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
                metadata: { model, messageLength: message.length }
            });

            return NextResponse.json(
                {
                    error: 'payment_required',
                    message: 'Payment required for this request',
                    payment: {
                        challenge: paymentChallenge.id,
                        amount: paymentChallenge.amount,
                        currency: paymentChallenge.currency,
                        recipient: paymentChallenge.recipient,
                        expiresAt: paymentChallenge.expiresAt
                    }
                },
                {
                    status: 402,
                    headers: {
                        'X-402-Challenge': paymentChallenge.id,
                        'X-402-Price': paymentChallenge.amount.toString(),
                        'X-402-Currency': paymentChallenge.currency,
                        'X-402-Recipient': paymentChallenge.recipient,
                        'X-402-Expiry': paymentChallenge.expiresAt
                    }
                }
            );
        }

        // Verify challenge exists and is valid
        const challengeData = x402.getChallenge(challenge);
        if (!challengeData || challengeData.expiresAt < new Date()) {
            // Generate new challenge
            const newChallenge = x402.createChallenge({
                amount: Math.round(cost * 10000) / 10000,
                metadata: { model, messageLength: message.length }
            });

            return NextResponse.json(
                {
                    error: 'challenge_expired',
                    message: 'Payment challenge expired',
                    payment: {
                        challenge: newChallenge.id,
                        amount: newChallenge.amount,
                        currency: newChallenge.currency,
                        recipient: newChallenge.recipient,
                        expiresAt: newChallenge.expiresAt
                    }
                },
                {
                    status: 402,
                    headers: {
                        'X-402-Challenge': newChallenge.id,
                        'X-402-Price': newChallenge.amount.toString(),
                        'X-402-Currency': newChallenge.currency,
                        'X-402-Recipient': newChallenge.recipient,
                        'X-402-Expiry': newChallenge.expiresAt
                    }
                }
            );
        }

        // Verify signature using x402-next
        const isValidSignature = await verifySignature({
            signature,
            message: challenge,
            publicKey: walletAddress
        });

        if (!isValidSignature) {
            return NextResponse.json(
                { error: 'invalid_signature', message: 'Invalid payment signature' },
                { status: 401 }
            );
        }

        // Verify wallet has sufficient balance
        try {
            const publicKey = new PublicKey(walletAddress);
            const balances = await getWalletBalances(publicKey);

            if (balances.usdc < challengeData.amount) {
                return NextResponse.json(
                    {
                        error: 'insufficient_balance',
                        message: `Insufficient USDC balance. Required: ${challengeData.amount}, Available: ${balances.usdc}`
                    },
                    { status: 402 }
                );
            }
        } catch (error) {
            console.error('Balance verification error:', error);
            return NextResponse.json(
                { error: 'payment_verification_failed', message: 'Could not verify wallet balance' },
                { status: 402 }
            );
        }

        // If transaction hash provided, verify it
        const transactionHash = request.headers.get('X-402-Transaction');
        if (transactionHash) {
            try {
                const isConfirmed = await verifyTransaction(transactionHash);
                if (!isConfirmed) {
                    return NextResponse.json(
                        { error: 'transaction_not_confirmed', message: 'Transaction not confirmed on blockchain' },
                        { status: 402 }
                    );
                }
            } catch (error) {
                console.error('Transaction verification error:', error);
                return NextResponse.json(
                    { error: 'transaction_verification_failed', message: 'Could not verify transaction' },
                    { status: 402 }
                );
            }
        }

        // Mark challenge as used
        x402.markChallengeUsed(challenge);

        console.log(`✅ X402 payment verified for ${walletAddress} - ${challengeData.amount} USDC`);
        return null; // Payment verified, allow request to proceed

    } catch (error) {
        console.error('X402 middleware error:', error);
        return NextResponse.json(
            { error: 'payment_system_error', message: 'Payment verification system error' },
            { status: 500 }
        );
    }
}