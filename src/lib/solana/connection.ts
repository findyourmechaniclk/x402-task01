// src/lib/solana/connection.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaNetwork } from '@/types';
import { NETWORK_CONFIGS, USDC_MINT_ADDRESSES } from '@/config/constants';

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
        return `http://localhost:3000/tx/${signature}`;
    }

    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function getAddressExplorerUrl(address: string): string {
    const network = getCurrentNetwork();

    if (network === 'localnet') {
        return `http://localhost:3000/address/${address}`;
    }

    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
}