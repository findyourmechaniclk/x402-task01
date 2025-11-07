// src/hooks/useX402Payment.ts
import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import nacl from 'tweetnacl';

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
    const { wallet, address } = useWallet();

    const processPayment = useCallback(async (
        paymentData: PaymentData,
        message: string,
        model: string
    ): Promise<boolean> => {
        if (!wallet || !address) {
            setPaymentError('Wallet not connected');
            return false;
        }

        setIsPaying(true);
        setPaymentError(null);

        try {
            // Step 1: Sign the challenge with Phantom wallet
            const messageToSign = paymentData.challenge;
            const messageBytes = new TextEncoder().encode(messageToSign);

            const signatureResult = await wallet.signMessage(messageBytes);
            const signatureHex = Array.from(signatureResult.signature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            console.log('✅ Payment challenge signed');

            // Step 2: Send chat request with X402 headers
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-402-Challenge': paymentData.challenge,
                    'X-402-Signature': signatureHex,
                    'X-402-Address': address,
                    'X-402-Payment-Required': 'true'
                },
                body: JSON.stringify({ message, model })
            });

            if (response.status === 402) {
                // Still need payment - likely insufficient balance or other issue
                const errorData = await response.json();
                throw new Error(errorData.message || 'Payment verification failed');
            }

            if (!response.ok) {
                throw new Error('Chat request failed after payment');
            }

            console.log('✅ Payment verified and chat request completed');
            return true;

        } catch (error) {
            console.error('Payment processing error:', error);
            setPaymentError(error instanceof Error ? error.message : 'Payment failed');
            return false;
        } finally {
            setIsPaying(false);
        }
    }, [wallet, address]);

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