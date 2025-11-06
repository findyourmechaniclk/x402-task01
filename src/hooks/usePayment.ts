'use client';

// hooks/usePayment.ts
/**
 * Payment Hook for X402 Protocol
 * Handles payment challenges, signing, and verification
 */
import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { signChallenge } from '@/lib/wallet/phantom';
import { X402PaymentData } from '@/types/x402';
import { PaymentVerification } from '@/types/payment';

interface PaymentState {
    loading: boolean;
    error: string | null;
    challenge: X402PaymentData | null;
}

interface PaymentHookReturn extends PaymentState {
    requestPayment: (challenge: X402PaymentData) => Promise<PaymentVerification | null>;
    clearError: () => void;
    clearChallenge: () => void;
}

export function usePayment(): PaymentHookReturn {
    const { address, connected, balance } = useWallet();
    const [state, setState] = useState<PaymentState>({
        loading: false,
        error: null,
        challenge: null,
    });

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const clearChallenge = useCallback(() => {
        setState(prev => ({ ...prev, challenge: null }));
    }, []);

    const requestPayment = useCallback(
        async (paymentData: X402PaymentData): Promise<PaymentVerification | null> => {
            // Validate wallet connection
            if (!connected || !address) {
                setState(prev => ({
                    ...prev,
                    error: 'Wallet not connected. Please connect your wallet first.',
                }));
                return null;
            }

            // Check sufficient balance
            if (balance && balance.usdc < paymentData.amount) {
                setState(prev => ({
                    ...prev,
                    error: `Insufficient USDC balance. Required: ${paymentData.amount} USDC, Available: ${balance.usdc} USDC`,
                }));
                return null;
            }

            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
                challenge: paymentData,
            }));

            try {
                // Step 1: Sign the challenge with Phantom wallet
                const signature = await signChallenge(paymentData.challenge);

                // Step 2: Send payment verification to server
                const verifyResponse = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        challenge: paymentData.challenge,
                        signature,
                        walletAddress: address,
                        amount: paymentData.amount,
                        recipient: paymentData.recipient,
                    }),
                });

                if (!verifyResponse.ok) {
                    const errorData = await verifyResponse.json();
                    throw new Error(
                        errorData.error?.message || 'Payment verification failed'
                    );
                }

                const verification: PaymentVerification = await verifyResponse.json();

                if (!verification.success || !verification.verified) {
                    throw new Error(
                        verification.error?.message || 'Payment verification failed'
                    );
                }

                setState({
                    loading: false,
                    error: null,
                    challenge: null,
                });

                return verification;
            } catch (error) {
                console.error('Payment error:', error);
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Payment failed. Please try again.';

                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                }));

                return null;
            }
        },
        [connected, address, balance]
    );

    return {
        ...state,
        requestPayment,
        clearError,
        clearChallenge,
    };
}

/**
 * Hook to calculate estimated cost for a request
 */
export function useEstimateCost() {
    const calculateCost = useCallback((model: string, messageLength: number): number => {
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

        const pricing = modelPricing[model.toLowerCase()] || {
            base: 0.01,
            perToken: 0.000005,
        };

        const cost = pricing.base + estimatedTokens * pricing.perToken;

        // Round to 2 decimal places and ensure minimum of 0.01 USDC
        return Math.max(0.01, Math.round(cost * 100) / 100);
    }, []);

    return { calculateCost };
}