// lib/x402/headers.ts
/**
 * X402 HTTP Header Utilities
 * Helper functions for parsing and formatting X402 protocol headers
 */
import { X402Headers } from '@/types/x402';

/**
 * Parse X402 headers from Request object
 */
export function parseX402Headers(request: Request): X402Headers {
    const headers: X402Headers = {};

    // Extract all X-402-* headers
    const headerKeys = [
        'X-402-Challenge',
        'X-402-Signature',
        'X-402-Address',
        'X-402-Payment-Required',
        'X-402-Price',
        'X-402-Currency',
        'X-402-Recipient',
        'X-402-Expiry',
        'X-402-Validated',
        'X-402-Transaction',
    ] as const;

    headerKeys.forEach((key) => {
        const value = request.headers.get(key);
        if (value) {
            headers[key] = value;
        }
    });

    return headers;
}

/**
 * Parse X402 headers from Headers object
 */
export function parseX402HeadersFromObject(headers: Headers): X402Headers {
    const x402Headers: X402Headers = {};

    const headerKeys = [
        'X-402-Challenge',
        'X-402-Signature',
        'X-402-Address',
        'X-402-Payment-Required',
        'X-402-Price',
        'X-402-Currency',
        'X-402-Recipient',
        'X-402-Expiry',
        'X-402-Validated',
        'X-402-Transaction',
    ] as const;

    headerKeys.forEach((key) => {
        const value = headers.get(key);
        if (value) {
            x402Headers[key] = value;
        }
    });

    return x402Headers;
}

/**
 * Create X402 payment required response headers
 */
export function createPaymentRequiredHeaders(
    challenge: string,
    amount: number,
    recipient: string,
    expiresAt: string,
    currency: string = 'USDC'
): HeadersInit {
    return {
        'X-402-Challenge': challenge,
        'X-402-Price': amount.toString(),
        'X-402-Currency': currency,
        'X-402-Recipient': recipient,
        'X-402-Expiry': expiresAt,
        'Content-Type': 'application/json',
    };
}

/**
 * Create X402 validated headers for successful payment
 */
export function createValidatedHeaders(
    challenge: string,
    transactionHash: string
): HeadersInit {
    return {
        'X-402-Validated': 'true',
        'X-402-Challenge': challenge,
        'X-402-Transaction': transactionHash,
        'Content-Type': 'application/json',
    };
}

/**
 * Check if request has X402 payment headers
 */
export function hasPaymentHeaders(headers: X402Headers): boolean {
    return !!(
        headers['X-402-Challenge'] &&
        headers['X-402-Signature'] &&
        headers['X-402-Address']
    );
}

/**
 * Extract payment information from X402 headers
 */
export interface X402PaymentInfo {
    challenge: string;
    signature: string;
    address: string;
    paymentRequired?: boolean;
}

export function extractPaymentInfo(headers: X402Headers): X402PaymentInfo | null {
    const challenge = headers['X-402-Challenge'];
    const signature = headers['X-402-Signature'];
    const address = headers['X-402-Address'];

    if (!challenge || !signature || !address) {
        return null;
    }

    return {
        challenge,
        signature,
        address,
        paymentRequired: headers['X-402-Payment-Required'] === 'true',
    };
}

/**
 * Format X402 headers for client request
 */
export function formatClientHeaders(
    challenge: string,
    signature: string,
    address: string
): HeadersInit {
    return {
        'X-402-Challenge': challenge,
        'X-402-Signature': signature,
        'X-402-Address': address,
        'X-402-Payment-Required': 'true',
        'Content-Type': 'application/json',
    };
}

/**
 * Parse error from X402 response
 */
export interface X402ErrorInfo {
    error: string;
    message: string;
    challenge?: string;
    price?: number;
    currency?: string;
    recipient?: string;
    expiresAt?: string;
}

export function parseX402Error(response: Response): X402ErrorInfo | null {
    if (response.status !== 402) {
        return null;
    }

    const headers = parseX402HeadersFromObject(response.headers);

    return {
        error: 'payment_required',
        message: 'Payment required to access this resource',
        challenge: headers['X-402-Challenge'],
        price: headers['X-402-Price'] ? parseFloat(headers['X-402-Price']) : undefined,
        currency: headers['X-402-Currency'],
        recipient: headers['X-402-Recipient'],
        expiresAt: headers['X-402-Expiry'],
    };
}

/**
 * Validate X402 challenge format
 */
export function isValidChallenge(challenge: string): boolean {
    // Challenge should be a hex string of at least 32 characters
    return /^[a-f0-9]{32,}$/i.test(challenge);
}

/**
 * Validate X402 signature format
 */
export function isValidSignature(signature: string): boolean {
    // Signature should be a hex string of at least 64 characters
    return /^[a-f0-9]{64,}$/i.test(signature);
}

/**
 * Validate Solana address format (basic check)
 */
export function isValidAddress(address: string): boolean {
    // Solana addresses are base58 strings of 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Create 402 Payment Required response
 */
export function createPaymentRequiredResponse(
    challenge: string,
    amount: number,
    recipient: string,
    expiresAt: string,
    message: string = 'Payment required for this request'
): Response {
    const headers = createPaymentRequiredHeaders(
        challenge,
        amount,
        recipient,
        expiresAt
    );

    const body = {
        error: 'payment_required',
        message,
        payment: {
            challenge,
            amount,
            currency: 'USDC',
            recipient,
            expiresAt,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 402,
        headers,
    });
}

/**
 * Create successful payment response
 */
export function createSuccessResponse(
    data: unknown,
    challenge: string,
    transactionHash: string
): Response {
    const headers = createValidatedHeaders(challenge, transactionHash);

    return new Response(JSON.stringify(data), {
        status: 200,
        headers,
    });
}

/**
 * Create error response
 */
export function createErrorResponse(
    message: string,
    status: number = 400,
    code: string = 'ERROR'
): Response {
    return new Response(
        JSON.stringify({
            success: false,
            error: {
                code,
                message,
            },
        }),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}