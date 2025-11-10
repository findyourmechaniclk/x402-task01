// src/hooks/usePaymentEstimation.ts
'use client';

import { useCallback } from 'react';
import { getModelById } from '@/config/models';

const X402_MIN_PAYMENT = Number(process.env.NEXT_PUBLIC_X402_MIN_PAYMENT || 0.005);

export function usePaymentEstimation() {
    const estimatePayment = useCallback((
        model: string,
        messageLength: number
    ): { amount: number; currency: string } => {
        const modelConfig = getModelById(model);

        if (!modelConfig) {
            return { amount: 0.01, currency: 'USDC' };
        }

        // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
        const estimatedInputTokens = Math.ceil(messageLength / 4);

        // Estimate output tokens (assume response is roughly same length as input, minimum 10 tokens)
        const estimatedOutputTokens = Math.max(10, Math.ceil(messageLength / 4));

        // Calculate total cost: base + input tokens + estimated output tokens
        const totalCost = modelConfig.pricing.baseRequest +
            (estimatedInputTokens * modelConfig.pricing.perToken.input) +
            (estimatedOutputTokens * modelConfig.pricing.perToken.output);

        // Round to 4 decimal places, ensure minimum payment
        const finalAmount = Math.max(X402_MIN_PAYMENT, Math.round(totalCost * 100000) / 100000);

        return {
            amount: finalAmount,
            currency: 'USDC'
        };
    }, []);

    return { estimatePayment };
}