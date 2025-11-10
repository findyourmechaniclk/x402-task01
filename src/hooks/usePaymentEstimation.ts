// src/hooks/usePaymentEstimation.ts
'use client';

import { useCallback } from 'react';
import { getModelById } from '@/config/models';

export function usePaymentEstimation() {
    const estimatePayment = useCallback((
        model: string,
        messageLength: number
    ): { amount: number; currency: string } => {
        const modelConfig = getModelById(model);

        if (!modelConfig) {
            return { amount: 0.01, currency: 'USDC' };
        }

        const estimatedTokens = Math.ceil(messageLength / 4);
        const estimatedAmount = modelConfig.pricing.baseRequest +
            (estimatedTokens * modelConfig.pricing.perToken.input);

        return {
            amount: Math.max(0.00001, Math.round(estimatedAmount * 100000) / 100000),
            currency: 'USDC'
        };
    }, []);

    return { estimatePayment };
}