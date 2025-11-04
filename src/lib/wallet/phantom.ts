// src/lib/wallet/phantom.ts
/**
 * Phantom wallet utilities: provider detection, connection helpers,
 * transaction/message signing, event subscriptions, and display helpers.
 * These functions wrap the Phantom provider to present a typed, safe
 * surface to the rest of the app.
 */
import { PublicKey, Transaction } from '@solana/web3.js';
import { SignMessageResponse } from '@/types';

// Phantom wallet interface
/**
 * Minimal Phantom provider interface used by this app.
 * Note: The actual provider may expose more fields, but we keep to
 * the commonly used subset to maintain portability and clarity.
 */
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
/**
 * Augment the window type so TypeScript recognizes `window.solana`.
 */
declare global {
    interface Window {
        solana?: PhantomProvider;
    }
}

/**
 * Resolve the Phantom provider from `window.solana` if available and
 * verified as Phantom. Returns null on SSR or if not installed.
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
 * Convenience check for provider availability.
 */
export function isPhantomInstalled(): boolean {
    return getPhantomProvider() !== null;
}

/**
 * Initiate a user-driven connection flow. Returns the connected address
 * on success or null if the user cancels or an error occurs.
 */
export async function connectWallet(): Promise<string | null> {
    const provider = getPhantomProvider();

    if (!provider) {
        console.error('Phantom wallet not found');
        return null;
    }

    try {
        const response = await provider.connect();
        const publicKey = response.publicKey.toString();

        console.log('Wallet connected:', publicKey);
        return publicKey;
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        return null;
    }
}

/**
 * Disconnect the wallet if connected. Errors are logged and swallowed.
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
    }
}

/**
 * Return the currently connected public key or null.
 */
export function getPublicKey(): PublicKey | null {
    const provider = getPhantomProvider();
    return provider?.publicKey || null;
}

/**
 * Boolean convenience check for connection state.
 */
export function isWalletConnected(): boolean {
    const provider = getPhantomProvider();
    return provider?.isConnected || false;
}

/**
 * Ask Phantom to sign a single transaction. Throws when provider is
 * unavailable or the wallet is not connected.
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
        throw error;
    }
}

/**
 * Ask Phantom to sign multiple transactions. Throws on missing provider
 * or when the wallet is not connected.
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
        throw error;
    }
}

/**
 * Request a message signature suitable for authentication flows.
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
        throw error;
    }
}

/**
 * Convenience helper to sign a string challenge and return the signature
 * as a hex string for use in X402 protocol flows.
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
 * Subscribe to wallet connect/disconnect/account-change events.
 * Callers can update UI or state in response to provider events.
 */
export type WalletEventCallback = (publicKey: PublicKey | null) => void;

export function onWalletConnect(callback: WalletEventCallback): void {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    const handler = () => {
        callback(provider.publicKey);
    };

    provider.on('connect', handler);
}

export function onWalletDisconnect(callback: WalletEventCallback): void {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    const handler = () => {
        callback(null);
    };

    provider.on('disconnect', handler);
}

export function onWalletAccountChange(callback: WalletEventCallback): void {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    const handler = (publicKey: unknown) => {
        // Handle different parameter types that Phantom might pass
        if (publicKey instanceof PublicKey) {
            callback(publicKey);
        } else if (typeof publicKey === 'string') {
            // Convert string to PublicKey if needed
            try {
                callback(new PublicKey(publicKey));
            } catch {
                callback(null);
            }
        } else if (publicKey === null) {
            callback(null);
        } else {
            // Fallback: pass null if we can't determine the public key
            callback(null);
        }
    };

    provider.on('accountChanged', handler);
}

/**
 * Remove event listeners. Phantom handles internal listener cleanup on
 * disconnect; this is provided as a semantic placeholder.
 */
export function offWalletEvents(): void {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    // Remove all listeners (Phantom handles this internally)
    // Provider will clean up on disconnect
}

/**
 * Attempt a trusted auto-connect (no prompt) if the user allowed it
 * previously. Returns address or null.
 */
export async function autoConnect(): Promise<string | null> {
    const provider = getPhantomProvider();

    if (!provider) {
        return null;
    }

    try {
        const response = await provider.connect({ onlyIfTrusted: true });
        return response.publicKey.toString();
    } catch {
        // User hasn't previously connected, or chose not to auto-connect
        return null;
    }
}

/**
 * Shorten a wallet address for UI display, e.g. `4Jk9...2hXq`.
 */
export function formatWalletAddress(address: string, chars = 4): string {
    if (!address || address.length < chars * 2) {
        return address;
    }

    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}