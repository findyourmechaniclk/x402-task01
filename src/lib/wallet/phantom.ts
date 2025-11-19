// src/lib/wallet/phantom.ts
/**
 * Phantom wallet utilities: provider detection, connection helpers,
 * transaction/message signing, event subscriptions, and display helpers.
 */
import { PublicKey, Transaction } from '@solana/web3.js';
import { SignMessageResponse } from '@/types/wallet';

// Phantom wallet interface
interface PhantomProvider {
    isPhantom?: boolean;
    publicKey: PublicKey | null;
    isConnected: boolean;
    signTransaction<T extends Transaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends Transaction>(transactions: T[]): Promise<T[]>;
    signMessage(message: Uint8Array, display?: string): Promise<SignMessageResponse>;
    connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
    disconnect(): Promise<void>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
}

// Extend window object
declare global {
    interface Window {
        solana?: PhantomProvider;
    }
}

/**
 * Resolve the Phantom provider from window.solana if available
 * Returns null on SSR or if not installed
 */
export function getPhantomProvider(): PhantomProvider | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if ('solana' in window) {
        const provider = window.solana;
        if (provider?.isPhantom) {
            return provider;
        }
    }

    return null;
}

/**
 * Check if Phantom wallet is installed
 */
export function isPhantomInstalled(): boolean {
    return getPhantomProvider() !== null;
}

/**
 * Connect to Phantom wallet
 * Returns the connected wallet address on success or null on failure
 */
export async function connectWallet(): Promise<string | null> {
    const provider = getPhantomProvider();

    if (!provider) {
        throw new Error('Phantom wallet not found. Please install the Phantom browser extension.');
    }

    try {
        const response = await provider.connect();
        const publicKey = response.publicKey.toString();
        console.log('Wallet connected:', publicKey);
        return publicKey;
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to connect wallet: ${error.message}`);
        }
        throw new Error('Failed to connect wallet: Unknown error');
    }
}

/**
 * Disconnect the wallet if connected
 */
export async function disconnectWallet(): Promise<void> {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    try {
        await provider.disconnect();
        console.log('Wallet disconnected');
    } catch (error) {
        console.error('Failed to disconnect wallet:', error);
        throw new Error('Failed to disconnect wallet');
    }
}

/**
 * Get the currently connected public key or null
 */
export function getPublicKey(): PublicKey | null {
    const provider = getPhantomProvider();
    return provider?.publicKey || null;
}

/**
 * Check if wallet is currently connected
 */
export function isWalletConnected(): boolean {
    const provider = getPhantomProvider();
    return provider?.isConnected || false;
}

/**
 * Sign a single transaction with Phantom wallet
 */
export async function signTransaction<T extends Transaction>(
    transaction: T
): Promise<T> {
    const provider = getPhantomProvider();

    if (!provider) {
        throw new Error('Phantom wallet not available');
    }

    if (!provider.publicKey) {
        throw new Error('Wallet not connected');
    }

    try {
        const signedTransaction = await provider.signTransaction(transaction);
        return signedTransaction;
    } catch (error) {
        console.error('Failed to sign transaction:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
        throw new Error('Failed to sign transaction');
    }
}

/**
 * Sign multiple transactions with Phantom wallet
 */
export async function signAllTransactions<T extends Transaction>(
    transactions: T[]
): Promise<T[]> {
    const provider = getPhantomProvider();

    if (!provider) {
        throw new Error('Phantom wallet not available');
    }

    if (!provider.publicKey) {
        throw new Error('Wallet not connected');
    }

    try {
        const signedTransactions = await provider.signAllTransactions(transactions);
        return signedTransactions;
    } catch (error) {
        console.error('Failed to sign transactions:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to sign transactions: ${error.message}`);
        }
        throw new Error('Failed to sign transactions');
    }
}

/**
 * Sign a message for authentication flows
 */
export async function signMessage(
    message: Uint8Array,
    display?: string
): Promise<SignMessageResponse> {
    const provider = getPhantomProvider();

    if (!provider) {
        throw new Error('Phantom wallet not available');
    }

    if (!provider.publicKey) {
        throw new Error('Wallet not connected');
    }

    try {
        const response = await provider.signMessage(message, display);
        return response;
    } catch (error) {
        console.error('Failed to sign message:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to sign message: ${error.message}`);
        }
        throw new Error('Failed to sign message');
    }
}

/**
 * Sign a challenge string and return hex signature for X402 protocol
 */
export async function signChallenge(challenge: string): Promise<string> {
    const messageBuffer = new TextEncoder().encode(challenge);
    const { signature } = await signMessage(messageBuffer);

    // Convert Uint8Array to hex string
    return Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Wallet event callback type
 */
export type WalletEventCallback = (publicKey: PublicKey | null) => void;

/**
 * Subscribe to wallet connect events
 */
export function onWalletConnect(callback: WalletEventCallback): () => void {
    const provider = getPhantomProvider();

    if (!provider) {
        return () => { };
    }

    const handler = () => {
        callback(provider.publicKey);
    };

    provider.on('connect', handler);

    // Return cleanup function
    return () => {
        provider.off('connect', handler);
    };
}

/**
 * Subscribe to wallet disconnect events
 */
export function onWalletDisconnect(callback: WalletEventCallback): () => void {
    const provider = getPhantomProvider();

    if (!provider) {
        return () => { };
    }

    const handler = () => {
        callback(null);
    };

    provider.on('disconnect', handler);

    // Return cleanup function
    return () => {
        provider.off('disconnect', handler);
    };
}

/**
 * Subscribe to wallet account change events
 */
export function onWalletAccountChange(callback: WalletEventCallback): () => void {
    const provider = getPhantomProvider();

    if (!provider) {
        return () => { };
    }

    const handler = (publicKey: unknown) => {
        if (publicKey instanceof PublicKey) {
            callback(publicKey);
        } else if (typeof publicKey === 'string') {
            try {
                callback(new PublicKey(publicKey));
            } catch {
                callback(null);
            }
        } else if (publicKey === null) {
            callback(null);
        } else {
            callback(null);
        }
    };

    provider.on('accountChanged', handler);

    // Return cleanup function
    return () => {
        provider.off('accountChanged', handler);
    };
}

/**
 * Format wallet address for display (shortened version)
 */
export function formatWalletAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    if (address.length <= chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Validate if a string is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Attempt to auto-connect if wallet was previously connected
 */
export async function autoConnect(): Promise<string | null> {
    const provider = getPhantomProvider();

    if (!provider) {
        return null;
    }

    try {
        // Try to connect with onlyIfTrusted flag
        const response = await provider.connect({ onlyIfTrusted: true });
        const publicKey = response.publicKey.toString();
        console.log('Wallet auto-connected:', publicKey);
        return publicKey;
    } catch (error) {
        // User hasn't trusted the app yet or rejected
        return null;
    }
}