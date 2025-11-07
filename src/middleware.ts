// src/middleware.ts - Next.js middleware using official x402-next package
import { NextRequest, NextResponse } from 'next/server';
import { createX402Middleware } from './middleware/x402';

export async function middleware(request: NextRequest) {
    // Only apply X402 to API routes that require payment
    if (request.nextUrl.pathname.startsWith('/api/chat')) {
        const x402Middleware = createX402Middleware();
        return await x402Middleware(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/chat/:path*',
        '/api/models/:path*'
    ]
};