// src/components/WalletConnect/WalletButton.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@/contexts/WalletContext';
import { formatBalance } from '@/lib/wallet/balance';
import { formatWalletAddress } from '@/lib/wallet/phantom';
import { WalletInfo } from '@/components/WalletConnect/WalletInfo';

/**
 * WalletButton
 * Displays connect/disconnect actions and a wallet dropdown.
 * Manages click-outside closing and shows SOL/USDC balances.
 */
export function WalletButton() {
    const {
        wallet,
        balance,
        isConnected,
        connect,
        disconnect,
        refreshBalance,
        isPhantomInstalled,
    } = useWallet();

    // Dropdown visibility state and container ref for click-outside detection
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdown when clicking outside the component
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            const clickedOutsideContainer = !containerRef.current || !containerRef.current.contains(target);
            const clickedOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target);
            if (open && clickedOutsideContainer && clickedOutsideDropdown) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Keep dropdown positioned under the toggle button using viewport coordinates
    useEffect(() => {
        function updatePosition() {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const panelWidth = 320; // w-80
            const gap = 8; // mt-2 equivalent
            const left = Math.max(8, rect.right - panelWidth);
            const top = rect.bottom + gap;
            setDropdownPos({ top, left });
        }

        if (open) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [open]);

    // Show install prompt when Phantom is not available
    if (!isPhantomInstalled) {
        return (
            <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
            >
                Install Phantom
            </a>
        );
    }

    // Loading state: wallet connection in progress
    if (wallet.loading) {
        return (
            <button
                disabled
                className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed"
            >
                <span className="flex items-center gap-2">
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Connecting...
                </span>
            </button>
        );
    }

    // Error state: allow retrying the connection
    if (wallet.error) {
        return (
            <div className="flex flex-row-reverse items-end gap-2">
                <button
                    onClick={connect}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                    Retry Connection
                </button>
                <p className="text-xs text-red-400 max-w-xs text-right">{wallet.error}</p>
            </div>
        );
    }

    // Not connected: render primary Connect Wallet button
    if (!isConnected || !wallet.address) {
        return (
            <button
                onClick={connect}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Connected state: compact button toggles dropdown */}
            <button
                ref={buttonRef}
                onClick={() => {
                    setOpen(v => {
                        const next = !v;
                        if (next && buttonRef.current) {
                            const rect = buttonRef.current.getBoundingClientRect();
                            const panelWidth = 320; // w-80
                            const gap = 8; // mt-2 equivalent
                            const left = Math.max(8, rect.right - panelWidth);
                            const top = rect.bottom + gap;
                            setDropdownPos({ top, left });
                        }
                        return next;
                    });
                }}
                aria-expanded={open}
                className="group bg-gradient-to-r from-purple-600 to-cyan-600 p-[1px] rounded-full transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            >
                {/* Inner capsule with subtle backdrop blur for contrast */}
                <span className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-white">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">{formatWalletAddress(wallet.address)}</span>
                    <span className="mx-1 text-gray-500">•</span>
                    <span className="text-xs text-gray-300">{formatBalance(wallet.balance?.usdc || 0, 'USDC')} USDC</span>
                    <svg
                        className="w-4 h-4 text-gray-300 transition-transform group-aria-expanded:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {/* Dropdown panel rendered via portal with fixed positioning for proper backdrop blur */}
            {mounted && open && dropdownPos && createPortal(
                <div
                    ref={dropdownRef}
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                    className="fixed w-80 bg-black/40 border border-white/10 rounded-xl shadow-xl backdrop-blur-lg p-4 z-[100]"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-cyan-400">Wallet</h3>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <WalletInfo />
                    <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                            onClick={refreshBalance}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm transition-colors"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => {
                                setOpen(false);
                                disconnect();
                            }}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
}