// src/components/WalletConnect/WalletButton.tsx
'use client';

import { useWallet } from '@/hooks/useWallet';
import { formatBalance } from '@/lib/wallet/balance';
import { formatWalletAddress } from '@/lib/wallet/phantom';

export function WalletButton() {
    const { wallet, balance, isConnected, connect, disconnect, isPhantomInstalled } = useWallet();

    if (!isPhantomInstalled) {
        return (
            <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
                Install Phantom
            </a>
        );
    }

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

    if (wallet.error) {
        return (
            <div className="flex flex-col items-end gap-2">
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

    if (!isConnected || !wallet.address) {
        return (
            <button
                onClick={connect}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{formatWalletAddress(wallet.address)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                        {formatBalance(balance.sol, 'SOL')} SOL
                    </span>
                    <span className="text-lg font-bold text-green-400">
                        {formatBalance(balance.usdc, 'USDC')} USDC
                    </span>
                </div>
            </div>
            <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
            >
                Disconnect
            </button>
        </div>
    );
}