// src/app/api/payment/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/wallet/solana';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const transactionHash = searchParams.get('tx');

        if (!transactionHash) {
            return NextResponse.json(
                { error: 'Transaction hash required' },
                { status: 400 }
            );
        }

        const isConfirmed = await verifyTransaction(transactionHash);

        return NextResponse.json({
            status: isConfirmed ? 'confirmed' : 'pending',
            transactionHash,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check payment status' },
            { status: 500 }
        );
    }
}