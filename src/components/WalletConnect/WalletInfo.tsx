// src/components/WalletConnect/WalletInfo.tsx
'use client';

import { useWallet } from '@/hooks/useWallet';
import { formatBalance } from '@/lib/wallet/balance';
import { formatWalletAddress } from '@/lib/wallet/phantom';

export function WalletInfo() {
    const { wallet, balance, isConnected } = useWallet();

    if (!isConnected || !wallet.address) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Wallet Information</h3>
            
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
            
            <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 text-center">
                    Connected via Phantom Wallet
                </p>
            </div>
        </div>
    );
}