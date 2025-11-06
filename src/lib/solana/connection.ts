// src/lib/solana/connection.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaNetwork } from '@/types/common';
import { NETWORK_CONFIGS, USDC_MINT_ADDRESSES } from '@/config/constants';

/**
 * Solana connection helpers
 *
 * Centralize RPC URL selection, network detection, and explorer links.
 * Also provides utilities for validating addresses and resolving the USDC mint.
 */
export function getCurrentNetwork(): SolanaNetwork {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork;

    if (!network || !NETWORK_CONFIGS[network]) {
        console.warn('Invalid network configuration, defaulting to devnet');
        return 'devnet';
    }

    return network;
}

export function getRpcUrl(): string {
    const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

    if (customRpcUrl) {
        return customRpcUrl;
    }

    const network = getCurrentNetwork();
    return NETWORK_CONFIGS[network].rpcUrl;
}

export function createConnection(): Connection {
    const rpcUrl = getRpcUrl();
    // Use confirmed commitment and a generous initial timeout for dev UX
    return new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });
}

export function getUsdcMintAddress(): PublicKey {
    const customMint = process.env.NEXT_PUBLIC_USDC_MINT;

    if (customMint) {
        try {
            return new PublicKey(customMint);
        } catch (error) {
            console.error('Invalid USDC mint address in environment:', error);
        }
    }

    const network = getCurrentNetwork();
    const mintAddress = USDC_MINT_ADDRESSES[network];

    if (!mintAddress) {
        throw new Error(`No USDC mint address configured for network: ${network}`);
    }

    // Fallback to known mint addresses per network
    return new PublicKey(mintAddress);
}

export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

export function getNetworkDisplayName(): string {
    const network = getCurrentNetwork();

    const displayNames: Record<SolanaNetwork, string> = {
        'mainnet-beta': 'Mainnet',
        'devnet': 'Devnet',
        'testnet': 'Testnet',
        'localnet': 'Localnet',
    };

    return displayNames[network] || network;
}

export function isLocalNetwork(): boolean {
    const network = getCurrentNetwork();
    return network === 'localnet';
}

export function getExplorerUrl(signature: string): string {
    const network = getCurrentNetwork();

    if (network === 'localnet') {
        // Use Solana Explorer with a custom RPC pointing to local validator
        const rpcUrl = getRpcUrl();
        return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
    }

    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function getAddressExplorerUrl(address: string): string {
    const network = getCurrentNetwork();

    if (network === 'localnet') {
        // Use Solana Explorer with a custom RPC pointing to local validator
        const rpcUrl = getRpcUrl();
        return `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
    }

    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
}