// src/hooks/useWallet.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletState, WalletBalance } from '@/types/wallet';
import {
    connectWallet,
    disconnectWallet,
    isPhantomInstalled,
    onWalletConnect,
    onWalletDisconnect,
    onWalletAccountChange,
    autoConnect,
} from '@/lib/wallet/phantom';
import { getWalletBalance } from '@/lib/wallet/balance';
import {
    getStoredWalletAddress,
    setStoredWalletAddress,
    clearStoredWalletAddress,
} from '@/lib/storage/localStorage';

/**
 * useWallet
 *
 * React hook that manages Phantom wallet connection state and balances.
 * Responsibilities:
 * - Connect/Disconnect via Phantom provider
 * - Auto-connect if previously trusted
 * - Subscribe to connect/disconnect/accountChanged events
 * - Fetch and refresh SOL/USDC balances for the current address
 */
export function useWallet() {
    // Wallet connection state (address, connected, loading, error)
    const [wallet, setWallet] = useState<WalletState>({
        address: null,
        connected: false,
        balance: null,
        loading: true,
        error: null,
    });

    // Wallet balances and last updated timestamp
    const [balance, setBalance] = useState<WalletBalance>({
        sol: 0,
        usdc: 0,
        lastUpdated: new Date(),
    });

    // Indicates when a balance refresh is in progress
    const [balanceLoading, setBalanceLoading] = useState(false);

    /**
     * Fetch latest balances for the given address and update state.
     * Uses dynamic mint decimals for USDC.
     */
    const updateBalance = useCallback(async (address: string) => {
        setBalanceLoading(true);

        try {
            const publicKey = new PublicKey(address);
            const newBalance = await getWalletBalance(publicKey);
            setBalance(newBalance);
        } catch (error) {
            console.error('Failed to update balance:', error);
            setWallet(prev => ({
                ...prev,
                error: 'Failed to fetch balance',
            }));
        } finally {
            setBalanceLoading(false);
        }
    }, []);

    /**
     * Connect to Phantom. On success, set wallet state and fetch balances.
     */
    const connect = useCallback(async () => {
        if (!isPhantomInstalled()) {
            setWallet(prev => ({
                ...prev,
                error: 'Phantom wallet not installed. Please install it from phantom.app',
                loading: false,
            }));
            return;
        }

        setWallet(prev => ({ ...prev, loading: true, error: null }));

        try {
            const address = await connectWallet();

            if (address) {
                setWallet({
                    address,
                    connected: true,
                    balance: null,
                    loading: false,
                    error: null,
                });

                setStoredWalletAddress(address);
                await updateBalance(address);
            } else {
                setWallet({
                    address: null,
                    connected: false,
                    balance: null,
                    loading: false,
                    error: 'Failed to connect wallet',
                });
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            setWallet({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }, [updateBalance]);

    /**
     * Disconnect from Phantom and clear wallet/balance state.
     */
    const disconnect = useCallback(async () => {
        try {
            await disconnectWallet();
            setWallet({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: null,
            });
            setBalance({
                sol: 0,
                usdc: 0,
                lastUpdated: new Date(),
            });
            clearStoredWalletAddress();
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    }, []);

    /**
     * Manually refresh balances for the current wallet address.
     */
    const refreshBalance = useCallback(async () => {
        if (wallet.address) {
            await updateBalance(wallet.address);
        }
    }, [wallet.address, updateBalance]);

    /**
     * Initial setup: if Phantom isn't installed, set error.
     * Otherwise attempt auto-connect and hydrate wallet state.
     */
    useEffect(() => {
        if (!isPhantomInstalled()) {
            setWallet({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: 'Phantom wallet not installed',
            });
            return;
        }

        autoConnect()
            .then(address => {
                if (address) {
                    setWallet({
                        address,
                        connected: true,
                        balance: null,
                        loading: false,
                        error: null,
                    });
                    updateBalance(address);
                } else {
                    const storedAddress = getStoredWalletAddress();
                    if (storedAddress) {
                        setWallet({
                            address: null,
                            connected: false,
                            balance: null,
                            loading: false,
                            error: null,
                        });
                    } else {
                        setWallet({
                            address: null,
                            connected: false,
                            balance: null,
                            loading: false,
                            error: null,
                        });
                    }
                }
            })
            .catch((error: Error) => {
                console.error('Auto-connect failed:', error);
                setWallet({
                    address: null,
                    connected: false,
                    balance: null,
                    loading: false,
                    error: null,
                });
            });
    }, [updateBalance]);

    /**
     * Subscribe to Phantom events once installed:
     * - connect: set address and balances
     * - disconnect: clear state
     * - accountChanged: update address and balances
     */
    useEffect(() => {
        if (!isPhantomInstalled()) {
            return;
        }

        onWalletConnect((publicKey: PublicKey | null) => {
            if (publicKey) {
                const address: string = publicKey.toString();
                setWallet(prev => ({
                    ...prev,
                    address,
                    connected: true,
                    error: null,
                }));
                setStoredWalletAddress(address);
                updateBalance(address);
            }
        });

        onWalletDisconnect(() => {
            setWallet({
                address: null,
                connected: false,
                balance: null,
                loading: false,
                error: null,
            });
            setBalance({
                sol: 0,
                usdc: 0,
                lastUpdated: new Date(),
            });
            clearStoredWalletAddress();
        });

        onWalletAccountChange(publicKey => {
            if (publicKey) {
                const address = publicKey.toString();
                setWallet(prev => ({
                    ...prev,
                    address,
                    error: null,
                }));
                setStoredWalletAddress(address);
                updateBalance(address);
            }
        });
    }, [updateBalance]);

    return {
        wallet,
        balance,
        balanceLoading,
        isConnected: wallet.connected,
        isLoading: wallet.loading,
        hasError: !!wallet.error,
        address: wallet.address,
        connect,
        disconnect,
        refreshBalance,
        isPhantomInstalled: isPhantomInstalled(),
    };
}