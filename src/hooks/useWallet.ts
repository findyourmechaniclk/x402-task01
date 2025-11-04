// src/hooks/useWallet.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletState, WalletBalance } from '@/types';
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

export function useWallet() {
    const [wallet, setWallet] = useState<WalletState>({
        address: null,
        connected: false,
        loading: true,
        error: null,
    });

    const [balance, setBalance] = useState<WalletBalance>({
        sol: 0,
        usdc: 0,
        lastUpdated: new Date(),
    });

    const [balanceLoading, setBalanceLoading] = useState(false);

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
                    loading: false,
                    error: null,
                });

                setStoredWalletAddress(address);
                await updateBalance(address);
            } else {
                setWallet({
                    address: null,
                    connected: false,
                    loading: false,
                    error: 'Failed to connect wallet',
                });
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            setWallet({
                address: null,
                connected: false,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }, [updateBalance]);

    const disconnect = useCallback(async () => {
        try {
            await disconnectWallet();
            setWallet({
                address: null,
                connected: false,
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

    const refreshBalance = useCallback(async () => {
        if (wallet.address) {
            await updateBalance(wallet.address);
        }
    }, [wallet.address, updateBalance]);

    useEffect(() => {
        if (!isPhantomInstalled()) {
            setWallet({
                address: null,
                connected: false,
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
                            loading: false,
                            error: null,
                        });
                    } else {
                        setWallet({
                            address: null,
                            connected: false,
                            loading: false,
                            error: null,
                        });
                    }
                }
            })
            .catch(error => {
                console.error('Auto-connect failed:', error);
                setWallet({
                    address: null,
                    connected: false,
                    loading: false,
                    error: null,
                });
            });
    }, [updateBalance]);

    useEffect(() => {
        if (!isPhantomInstalled()) {
            return;
        }

        onWalletConnect(publicKey => {
            if (publicKey) {
                const address = publicKey.toString();
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