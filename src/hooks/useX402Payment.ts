// src/hooks/useX402Payment.ts - Updated with real USDC transfers
'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { signMessage, signTransaction } from '@/lib/wallet/phantom';
import { createUSDCTransferTransaction, sendSignedTransaction, checkUSDCBalance } from '@/lib/wallet/transfers';
import { PublicKey } from '@solana/web3.js';
import type { ChatResponse } from '@/types/chat';

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
    processPayment: (paymentData: PaymentData, message: string, model: string) => Promise<ChatResponse | null>;
    clearError: () => void;
}

export function useX402Payment(): UseX402PaymentReturn {
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const { address, connected, balance, refreshBalance } = useWallet();

    const processPayment = useCallback(async (
        paymentData: PaymentData,
        message: string,
        model: string
    ) => {
        if (!connected || !address) {
            setPaymentError('Wallet not connected');
            return null;
        }

        if (balance && balance.usdc < paymentData.amount) {
            setPaymentError(`Insufficient USDC balance. Required: ${paymentData.amount}, Available: ${balance.usdc}`);
            return null;
        }

        setIsPaying(true);
        setPaymentError(null);

        try {
            const fromPublicKey = new PublicKey(address);
            const toPublicKey = new PublicKey(paymentData.recipient);

            console.log('💰 Checking USDC balance...');

            // Check balance before proceeding
            const balanceCheck = await checkUSDCBalance(fromPublicKey, paymentData.amount);
            if (!balanceCheck.hasBalance) {
                throw new Error(
                    `Insufficient balance. Required: ${paymentData.amount}, Available: ${balanceCheck.currentBalance}`
                );
            }

            console.log('🔗 Creating USDC transfer transaction...');

            // Create the transfer transaction
            const transaction = await createUSDCTransferTransaction(
                fromPublicKey,
                toPublicKey,
                paymentData.amount
            );

            console.log('🔐 Requesting wallet signature...');

            // Sign the transaction with user's wallet
            const signedTransaction = await signTransaction(transaction);

            console.log('📡 Sending transaction to blockchain...');

            // Send the signed transaction
            const transactionHash = await sendSignedTransaction(signedTransaction);

            console.log('✅ Transaction successful:', transactionHash);

            // Now sign the challenge for API authentication
            const messageBytes = new TextEncoder().encode(paymentData.challenge);
            const signatureResult = await signMessage(messageBytes);
            const signatureHex = Array.from(signatureResult.signature)
                .map((b: number) => b.toString(16).padStart(2, '0'))
                .join('');

            console.log('🔐 Challenge signed, making authenticated API request...');

            // Make the API request with both transaction proof and signature
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // X402 payment headers
                    'X-402-Challenge': paymentData.challenge,
                    'X-402-Signature': signatureHex,
                    'X-402-Address': address,
                    'X-402-Transaction': transactionHash,
                    'X-402-Payment-Required': 'true'
                },
                body: JSON.stringify({ message, model })
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 402) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Payment verification failed');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Request failed');
            }

            const responseData = await response.json();

            // Refresh wallet balance after successful payment
            await refreshBalance();

            console.log('✅ Payment processed successfully');
            return responseData;

        } catch (error) {
            console.error('❌ Payment processing error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
            setPaymentError(errorMessage);
            return null;
        } finally {
            setIsPaying(false);
        }
    }, [connected, address, refreshBalance, balance]);

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
export function usePaymentRequired<T extends object = Record<string, unknown>>() {
    const checkPaymentRequired = useCallback(async (
        endpoint: string,
        body: T
    ): Promise<PaymentData | null> => {
        try {
            console.log('🔍 Checking if payment is required for:', endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            console.log('📡 Payment check response status:', response.status);

            if (response.status === 402) {
                const data = await response.json();
                console.log('💳 Payment required:', data.payment);
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