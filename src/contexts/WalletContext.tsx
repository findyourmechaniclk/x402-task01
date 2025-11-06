'use client';

// contexts/WalletContext.tsx
/**
 * Wallet Context Provider
 * Manages global wallet state using React Context API
 * Initializes wallet connection and provides wallet data throughout the app
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
    connectWallet as phantomConnect,
    disconnectWallet as phantomDisconnect,
    getPublicKey,
    isWalletConnected,
    isPhantomInstalled,
    onWalletConnect,
    onWalletDisconnect,
    onWalletAccountChange,
} from '@/lib/wallet/phantom';
import { getWalletBalances } from '@/lib/wallet/solana';
import { WalletState, WalletBalance } from '@/types/wallet';

interface WalletContextType extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    refreshBalance: () => Promise<void>;
    isInstalled: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [state, setState] = useState<WalletState>({
        address: null,
        connected: false,
        balance: null,
        loading: false,
        error: null,
    });

    const [isInstalled, setIsInstalled] = useState(false);

    // Check if Phantom is installed
    useEffect(() => {
        const checkInstallation = () => {
            const installed = isPhantomInstalled();
            setIsInstalled(installed);

            if (!installed) {
                setState(prev => ({
                    ...prev,
                    error: 'Phantom wallet not installed. Please install the Phantom browser extension.',
                }));
            }
        };

        // Check immediately
        checkInstallation();

        // Check again after a short delay (for cases where Phantom loads slowly)
        const timeout = setTimeout(checkInstallation, 1000);

        return () => clearTimeout(timeout);
    }, []);

    // Fetch wallet balance
    const fetchBalance = useCallback(async (publicKey: PublicKey): Promise<WalletBalance | null> => {
        try {
            const balance = await getWalletBalances(publicKey);
            return balance;
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to fetch wallet balance';

            setState(prev => ({ ...prev, error: errorMessage, balance: null }));
            return null;
        }
    }, []);

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        const publicKey = getPublicKey();
        if (!publicKey) {
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));
        const balance = await fetchBalance(publicKey);
        setState(prev => ({ ...prev, balance, loading: false }));
    }, [fetchBalance]);

    // Connect wallet
    const connect = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const address = await phantomConnect();

            if (!address) {
                throw new Error('Failed to connect wallet');
            }

            const publicKey = new PublicKey(address);
            const balance = await fetchBalance(publicKey);

            setState({
                address,
                connected: true,
                balance,
                loading: false,
                error: null,
            });

            // Store connection state in localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('walletAddress', address);
            }
        } catch (error) {
            console.error('Connection error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to connect wallet';

            setState({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: errorMessage,
            });
        }
    }, [fetchBalance]);

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await phantomDisconnect();

            setState({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: null,
            });

            // Clear connection state from localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to disconnect wallet',
            }));
        }
    }, []);

    // Auto-connect on mount if previously connected
    useEffect(() => {
        const autoConnect = async () => {
            if (typeof window === 'undefined') return;

            const wasConnected = localStorage.getItem('walletConnected') === 'true';
            const savedAddress = localStorage.getItem('walletAddress');

            if (wasConnected && isWalletConnected()) {
                const publicKey = getPublicKey();
                if (publicKey && publicKey.toString() === savedAddress) {
                    const balance = await fetchBalance(publicKey);
                    setState({
                        address: publicKey.toString(),
                        connected: true,
                        balance,
                        loading: false,
                        error: null,
                    });
                }
            }
        };

        autoConnect();
    }, [fetchBalance]);

    // Set up wallet event listeners
    useEffect(() => {
        if (!isInstalled) return;

        // Handle connect events
        const cleanupConnect = onWalletConnect(async (publicKey) => {
            if (publicKey) {
                const balance = await fetchBalance(publicKey);
                setState(prev => ({
                    ...prev,
                    address: publicKey.toString(),
                    connected: true,
                    balance,
                    loading: false,
                    error: null,
                }));
            }
        });

        // Handle disconnect events
        const cleanupDisconnect = onWalletDisconnect(() => {
            setState({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: null,
            });

            if (typeof window !== 'undefined') {
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
            }
        });

        // Handle account change events
        const cleanupAccountChange = onWalletAccountChange(async (publicKey) => {
            if (publicKey) {
                const balance = await fetchBalance(publicKey);
                setState(prev => ({
                    ...prev,
                    address: publicKey.toString(),
                    balance,
                }));

                if (typeof window !== 'undefined') {
                    localStorage.setItem('walletAddress', publicKey.toString());
                }
            }
        });

        return () => {
            cleanupConnect();
            cleanupDisconnect();
            cleanupAccountChange();
        };
    }, [isInstalled, fetchBalance]);

    const value: WalletContextType = {
        ...state,
        connect,
        disconnect,
        refreshBalance,
        isInstalled,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

/**
 * Hook to use wallet context
 * Throws error if used outside WalletProvider
 */
export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);

    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }

    return context;
}

/**
 * Hook to check if wallet is ready (installed and initialized)
 */
export function useWalletReady(): boolean {
    const { isInstalled } = useWallet();
    return isInstalled;
}

/**
 * Hook to get wallet address or null
 */
export function useWalletAddress(): string | null {
    const { address } = useWallet();
    return address;
}

/**
 * Hook to get wallet balance or null
 */
export function useWalletBalance(): WalletBalance | null {
    const { balance } = useWallet();
    return balance;
}