// src/lib/wallet/phantom.ts
import { PublicKey, Transaction } from '@solana/web3.js';
import { SignMessageResponse } from '@/types';

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

// Get Phantom provider
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

// Check if Phantom is installed
export function isPhantomInstalled(): boolean {
    return getPhantomProvider() !== null;
}

// Connect wallet
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

// Disconnect wallet
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

// Get connected public key
export function getPublicKey(): PublicKey | null {
    const provider = getPhantomProvider();
    return provider?.publicKey || null;
}

// Check if wallet is connected
export function isWalletConnected(): boolean {
    const provider = getPhantomProvider();
    return provider?.isConnected || false;
}

// Sign transaction
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

// Sign multiple transactions
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

// Sign message
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

// Sign challenge for X402 protocol
export async function signChallenge(challenge: string): Promise<string> {
    const messageBuffer = new TextEncoder().encode(challenge);
    const { signature } = await signMessage(messageBuffer);

    // Convert Uint8Array to hex string
    return Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Listen to wallet events
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

    const handler = (publicKey: PublicKey) => {
        callback(publicKey);
    };

    provider.on('accountChanged', handler);
}

// Remove event listeners
export function offWalletEvents(): void {
    const provider = getPhantomProvider();

    if (!provider) {
        return;
    }

    // Remove all listeners (Phantom handles this internally)
    // Provider will clean up on disconnect
}

// Auto-connect if previously connected
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

// Format wallet address for display
export function formatWalletAddress(address: string, chars = 4): string {
    if (!address || address.length < chars * 2) {
        return address;
    }

    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}