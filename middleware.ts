// middleware.ts - Next.js middleware using official x402-next package
import { NextRequest } from 'next/server';
import { paymentMiddleware, SolanaAddress } from 'x402-next';

// Configure the payment middleware with your Solana wallet address and routes
const x402Middleware = paymentMiddleware(
    `${process.env.X402_RECIPIENT_WALLET}` as SolanaAddress, // Solana wallet address to receive payments
    {
        '/api/chat': {
            price: '$0.01', // USDC amount in dollars
            network: 'solana-devnet', // Use solana-devnet for testing
            config: {
                description: 'AI Chat Request',
                mimeType: 'application/json'
            }
        }
    }
);

export async function middleware(request: NextRequest) {
    // Apply X402 payment middleware to API routes
    if (request.nextUrl.pathname.startsWith('/api/chat')) {
        return await x402Middleware(request);
    }
}

export const config = {
    matcher: ['/api/chat/:path*']
};