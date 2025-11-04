// src/lib/wallet/balance.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { WalletBalance } from '@/types';
import { createConnection, getUsdcMintAddress } from '@/lib/solana/connection';

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

export async function getUsdcBalance(publicKey: PublicKey): Promise<number> {
    try {
        const connection = createConnection();
        const usdcMint = getUsdcMintAddress();

        const associatedTokenAddress = await getAssociatedTokenAddress(
            usdcMint,
            publicKey
        );

        try {
            const tokenAccount = await getAccount(connection, associatedTokenAddress);

            const balance = Number(tokenAccount.amount) / 1_000_000;

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

export function formatSolBalance(balance: number, decimals = 4): string {
    return balance.toFixed(decimals);
}

export function formatUsdcBalance(balance: number, decimals = 2): string {
    return balance.toFixed(decimals);
}

export function formatBalance(
    balance: number,
    currency: 'SOL' | 'USDC',
    decimals?: number
): string {
    if (currency === 'SOL') {
        return formatSolBalance(balance, decimals);
    }
    return formatUsdcBalance(balance, decimals);
}

export function hasSufficientSol(balance: number, required: number): boolean {
    return balance >= required;
}

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
    const usdcMint = getUsdcMintAddress();
    return await getAssociatedTokenAddress(usdcMint, publicKey);
}