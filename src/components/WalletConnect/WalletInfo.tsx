// src/components/WalletConnect/WalletInfo.tsx
'use client';

import { useWallet } from '@/contexts/WalletContext';
import { formatBalance } from '@/lib/wallet/balance';
import { formatWalletAddress } from '@/lib/wallet/phantom';
import { getAddressExplorerUrl } from '@/lib/solana/connection';

/**
 * WalletInfo
 * Shows connected wallet details: shortened address, SOL/USDC balances,
 * last updated time, and an external explorer link.
 */
export function WalletInfo() {
    const { wallet, balance, isConnected } = useWallet();

    if (!isConnected || !wallet.address) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-base font-semibold mb-3 text-cyan-400">Wallet Information</h3>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    {/* Shortened address for readability */}
                    <span className="text-gray-400">Address:</span>
                    <span className="font-mono text-sm text-gray-300">
                        {formatWalletAddress(wallet.address)}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    {/* SOL balance (native token) */}
                    <span className="text-gray-400">SOL Balance:</span>
                    <span className="text-green-400 font-semibold">
                        {formatBalance(wallet.balance?.sol || 0, 'SOL')} SOL
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    {/* USDC balance using dynamic mint decimals */}
                    <span className="text-gray-400">USDC Balance:</span>
                    <span className="text-green-400 font-semibold">
                        {formatBalance(wallet.balance?.usdc || 0, 'USDC')} USDC
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    {/* Last balance fetch timestamp */}
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-sm text-gray-500">
                        {wallet.balance?.lastUpdated?.toLocaleTimeString() || 'N/A'}
                    </span>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
                {/* External explorer link for the address */}
                <a
                    href={getAddressExplorerUrl(wallet.address!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-xs transition-colors"
                >
                    View on Explorer
                </a>
                <span className="text-xs text-gray-500">Connected via Phantom</span>
            </div>
        </div>
    );
}