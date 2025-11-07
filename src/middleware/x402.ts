// src/middleware/x402.ts - Fixed imports
import { NextRequest, NextResponse } from 'next/server';
import {
    createPaymentChallenge,
    verifyPaymentSignature,
    calculateRequestCost,
    createPaymentData
} from '@/lib/x402/protocol';
import { X402Challenge } from '@/types/x402'; // Import from types instead

const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET!;

export function createX402Middleware() {
    return async function x402Handler(request: NextRequest): Promise<NextResponse> {
        try {
            console.log('🔍 X402 Middleware: Processing request to', request.nextUrl.pathname);

            // Extract X402 headers
            const challenge = request.headers.get('X-402-Challenge');
            const signature = request.headers.get('X-402-Signature');
            const walletAddress = request.headers.get('X-402-Address');
            const paymentRequired = request.headers.get('X-402-Payment-Required');

            // Parse request body to calculate cost
            let body;
            try {
                const bodyText = await request.text();
                body = bodyText ? JSON.parse(bodyText) : {};
            } catch {
                body = {};
            }

            const model = body.model || 'gpt-3.5-turbo';
            const message = body.message || '';
            const cost = calculateRequestCost(model, message.length);

            console.log(`💰 Calculated cost: ${cost} USDC for model ${model}`);

            // If no payment headers, require payment
            if (!challenge || !signature || !walletAddress || paymentRequired !== 'true') {
                console.log('❌ No valid payment headers found, requiring payment');
                return createPaymentRequiredResponse(cost, model, message);
            }

            // Verify payment signature
            console.log('🔐 Verifying payment signature...');
            const isValidSignature = verifyPaymentSignature(challenge, signature, walletAddress);

            if (!isValidSignature) {
                console.log('❌ Invalid payment signature');
                return createPaymentRequiredResponse(cost, model, message, 'Invalid payment signature');
            }

            console.log('✅ Payment verified! Proceeding with request');

            // Create new request with body for the API route
            const newRequest = new NextRequest(request.url, {
                method: request.method,
                headers: request.headers,
                body: JSON.stringify(body),
            });

            // Continue to API route
            return NextResponse.next({
                request: newRequest
            });

        } catch (error) {
            console.error('❌ X402 Middleware error:', error);
            return NextResponse.json(
                {
                    error: 'Payment processing failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            );
        }
    };
}

function createPaymentRequiredResponse(
    cost: number,
    model: string,
    message: string,
    errorMessage: string = 'Payment required'
): NextResponse {
    // Create payment challenge
    const challenge: X402Challenge = createPaymentChallenge(cost, RECIPIENT_WALLET);
    const paymentData = createPaymentData(challenge);

    console.log('💳 Creating 402 Payment Required response:', paymentData);

    return NextResponse.json(
        {
            error: 'payment_required',
            message: errorMessage,
            payment: paymentData,
            details: {
                model,
                estimatedCost: cost,
                messagePreview: message.substring(0, 50) + '...'
            }
        },
        {
            status: 402,
            headers: {
                'X-402-Challenge': paymentData.challenge,
                'X-402-Price': paymentData.amount.toString(),
                'X-402-Currency': paymentData.currency,
                'X-402-Recipient': paymentData.recipient,
                'X-402-Expiry': paymentData.expiresAt,
                'Content-Type': 'application/json'
            }
        }
    );
}