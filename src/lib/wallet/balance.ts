// src/lib/wallet/balance.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';
import { WalletBalance } from '@/types';
import { createConnection, getUsdcMintAddress } from '@/lib/solana/connection';

/**
 * Balance utilities for SOL and USDC.
 *
 * - Reads SOL directly from RPC and converts lamports → SOL.
 * - Resolves the USDC mint's decimals via `getMint` so custom/local mints
 *   (which may not use 6 decimals) display correctly.
 * - Derives/reads the wallet's USDC associated token account (ATA).
 * - Provides simple formatting and affordability helpers for UI/flows.
 */

/**
 * Get SOL balance for a wallet, expressed in SOL (not lamports).
 */
export async function getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
        const connection = createConnection();
        const balance = await connection.getBalance(publicKey);

        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Failed to get SOL balance:', error);
        return 0;
    }
}

/**
 * Get USDC balance for the wallet's associated token account (ATA).
 *
 * Resolves mint decimals dynamically (fallback to 6 if mint info is unavailable)
 * and converts raw token amount → UI amount.
 */
export async function getUsdcBalance(publicKey: PublicKey): Promise<number> {
    try {
        const connection = createConnection();
        const usdcMint = getUsdcMintAddress();

        // Determine actual mint decimals dynamically; default to 6 if unavailable
        let decimals = 6;
        try {
            const mintInfo = await getMint(connection, usdcMint);
            //console.log('USDC mint info:', mintInfo);
            decimals = typeof mintInfo.decimals === 'number' ? mintInfo.decimals : 6;
        } catch (e) {
            console.warn('Unable to fetch USDC mint decimals, defaulting to 6:', e);
        }

        // Derive the USDC ATA for this wallet
        const associatedTokenAddress = await getAssociatedTokenAddress(
            usdcMint,
            publicKey
        );

        try {
            // Read SPL token account and convert using resolved decimals
            const tokenAccount = await getAccount(connection, associatedTokenAddress);

            const balance = Number(tokenAccount.amount) / Math.pow(10, decimals);

            return balance;
        } catch (error) {
            console.log('USDC token account not found, returning 0');
            return 0;
        }
    } catch (error) {
        console.error('Failed to get USDC balance:', error);
        return 0;
    }
}

export async function getWalletBalance(
    publicKey: PublicKey
): Promise<WalletBalance> {
    /**
     * Fetch SOL and USDC concurrently and return a UI-friendly snapshot.
     */
    try {
        const [sol, usdc] = await Promise.all([
            getSolBalance(publicKey),
            getUsdcBalance(publicKey),
        ]);

        return {
            sol,
            usdc,
            lastUpdated: new Date(),
        };
    } catch (error) {
        console.error('Failed to get wallet balance:', error);
        return {
            sol: 0,
            usdc: 0,
            lastUpdated: new Date(),
        };
    }
}

/** Format SOL for display (defaults to 4 decimal places). */
export function formatSolBalance(balance: number, decimals = 4): string {
    return balance.toFixed(decimals);
}

/** Format USDC for display (defaults to 2 decimal places for fiat‑like tokens). */
export function formatUsdcBalance(balance: number, decimals = 2): string {
    return balance.toFixed(decimals);
}

export function formatBalance(
    balance: number,
    currency: 'SOL' | 'USDC',
    decimals?: number
): string {
    // Convenience formatter based on currency type
    if (currency === 'SOL') {
        return formatSolBalance(balance, decimals);
    }
    return formatUsdcBalance(balance, decimals);
}

/** Check SOL balance against a required minimum (e.g., network fees). */
export function hasSufficientSol(balance: number, required: number): boolean {
    return balance >= required;
}

/** Check USDC balance against a required minimum (e.g., payment amount). */
export function hasSufficientUsdc(balance: number, required: number): boolean {
    return balance >= required;
}

export function canAffordTransaction(
    usdcBalance: number,
    solBalance: number,
    cost: number,
    estimatedGasFee = 0.000005
): {
    canAfford: boolean;
    reason?: string;
} {
    /**
     * Determine whether a wallet can afford a USDC-priced action and has enough SOL
     * for estimated fees. Returns a boolean and a human-readable reason when not.
     */
    if (usdcBalance < cost) {
        return {
            canAfford: false,
            reason: `Insufficient USDC. Required: ${cost}, Available: ${usdcBalance}`,
        };
    }

    if (solBalance < estimatedGasFee) {
        return {
            canAfford: false,
            reason: `Insufficient SOL for gas fees. Required: ${estimatedGasFee}, Available: ${solBalance}`,
        };
    }

    return { canAfford: true };
}

/**
 * Check whether the wallet has an existing USDC ATA.
 * Some flows auto-create ATAs; this helps preflight decisions.
 */
export async function hasUsdcTokenAccount(publicKey: PublicKey): Promise<boolean> {
    try {
        const connection = createConnection();
        const usdcMint = getUsdcMintAddress();

        const associatedTokenAddress = await getAssociatedTokenAddress(
            usdcMint,
            publicKey
        );

        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
        return accountInfo !== null;
    } catch (error) {
        console.error('Error checking token account:', error);
        return false;
    }
}

export async function getTokenAccountAddress(
    publicKey: PublicKey
): Promise<PublicKey> {
    /** Compute and return the USDC ATA for the wallet. */
    const usdcMint = getUsdcMintAddress();
    return await getAssociatedTokenAddress(usdcMint, publicKey);
}