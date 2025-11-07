// src/hooks/useX402Payment.ts - Fixed hook for X402 payments using proper wallet types
'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { signMessage } from '@/lib/wallet/phantom';
import type { WalletState } from '@/types/wallet';

interface PaymentData {
    challenge: string;
    amount: number;
    currency: string;
    recipient: string;
    expiresAt: string;
}

interface UseX402PaymentReturn {
    isPaying: boolean;
    paymentError: string | null;
    processPayment: (paymentData: PaymentData, message: string, model: string) => Promise<boolean>;
    clearError: () => void;
}

export function useX402Payment(): UseX402PaymentReturn {
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const { address, connected, balance } = useWallet();

    const processPayment = useCallback(async (
        paymentData: PaymentData,
        message: string,
        model: string
    ): Promise<boolean> => {
        if (!connected || !address) {
            setPaymentError('Wallet not connected');
            return false;
        }

        // Check balance
        if (balance && balance.usdc < paymentData.amount) {
            setPaymentError(`Insufficient USDC balance. Required: ${paymentData.amount}, Available: ${balance.usdc}`);
            return false;
        }

        setIsPaying(true);
        setPaymentError(null);

        try {
            // Step 1: Sign the payment challenge using Phantom wallet
            console.log('🔐 Signing payment challenge:', paymentData.challenge);

            const messageToSign = paymentData.challenge;
            const messageBytes = new TextEncoder().encode(messageToSign);

            // Use the phantom wallet signing function
            const signatureResult = await signMessage(messageBytes);
            const signatureHex = Array.from(signatureResult.signature)
                .map((b: number) => b.toString(16).padStart(2, '0'))
                .join('');

            console.log('✅ Payment challenge signed successfully');

            // Step 2: Make the chat request with X402 payment headers
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // X402 payment headers
                    'X-402-Challenge': paymentData.challenge,
                    'X-402-Signature': signatureHex,
                    'X-402-Address': address,
                    'X-402-Payment-Required': 'true'
                },
                body: JSON.stringify({ message, model })
            });

            // Check response status
            if (response.status === 402) {
                // Still need payment - payment verification failed
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error?.message || 'Payment verification failed');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Request failed after payment');
            }

            // Success - payment verified and request completed
            const responseData = await response.json();
            console.log('✅ Payment verified and request completed:', responseData);
            return true;

        } catch (error) {
            console.error('❌ Payment processing error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Payment processing failed';
            setPaymentError(errorMessage);
            return false;
        } finally {
            setIsPaying(false);
        }
    }, [connected, address, balance]);

    const clearError = useCallback(() => {
        setPaymentError(null);
    }, []);

    return {
        isPaying,
        paymentError,
        processPayment,
        clearError
    };
}

/**
 * Hook to check if payment is required for a request
 */
export function usePaymentRequired() {
    const checkPaymentRequired = useCallback(async (
        endpoint: string,
        body: any
    ): Promise<PaymentData | null> => {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 402) {
                const data = await response.json();
                return data.payment || null;
            }

            return null;
        } catch (error) {
            console.error('Error checking payment requirement:', error);
            return null;
        }
    }, []);

    return { checkPaymentRequired };
}

/**
 * Hook for estimating payment costs
 */
export function usePaymentEstimation() {
    const estimatePayment = useCallback((
        model: string,
        messageLength: number
    ): { amount: number; currency: string } => {
        // Simple estimation - in practice this would use model pricing
        const basePrice = 0.01; // $0.01 base price
        const lengthMultiplier = Math.max(1, messageLength / 1000);
        const estimatedAmount = Number((basePrice * lengthMultiplier).toFixed(4));

        return {
            amount: estimatedAmount,
            currency: 'USDC'
        };
    }, []);

    return { estimatePayment };
}