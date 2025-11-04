// src/components/WalletConnect/WalletInfo.tsx
'use client';

import { useWallet } from '@/hooks/useWallet';
import { formatBalance } from '@/lib/wallet/balance';
import { formatWalletAddress } from '@/lib/wallet/phantom';
import { getAddressExplorerUrl } from '@/lib/solana/connection';

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
                    <span className="text-gray-400">Address:</span>
                    <span className="font-mono text-sm text-gray-300">
                        {formatWalletAddress(wallet.address)}
                    </span>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">SOL Balance:</span>
                    <span className="text-green-400 font-semibold">
                        {formatBalance(balance.sol, 'SOL')} SOL
                    </span>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">USDC Balance:</span>
                    <span className="text-green-400 font-semibold">
                        {formatBalance(balance.usdc, 'USDC')} USDC
                    </span>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-sm text-gray-500">
                        {balance.lastUpdated.toLocaleTimeString()}
                    </span>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
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