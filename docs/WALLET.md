# Phantom Wallet Integration Guide

## 📱 Overview

Phantom Wallet integration enables users to connect their Solana wallets, manage USDC balances, and sign transactions for the X402 payment protocol.

## 🔧 Setup

### 1. Install Phantom Extension

Users must install the Phantom Wallet browser extension:
- [Phantom Wallet Chrome Store](https://chrome.google.com/webstore)
- [Phantom Wallet Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/phantom-app/)

### 2. Configure Network

Ensure Phantom is set to the correct Solana network:
- **Mainnet**: Production environment
- **Devnet**: Development/testing
- **Testnet**: Testing with SOL faucet

### 3. Create USDC Token Account

Users need to create an Associated Token Account (ATA) for USDC:

```typescript
// Create token account if not exists
const usdcMint = new PublicKey("EPjFWaLb3odcccccccccccccccccccccccccccccc")
const associatedToken = await getAssociatedTokenAddress(
  usdcMint,
  userPublicKey
)
```

## 📖 Implementation

### Connect Wallet

```typescript
// lib/wallet/phantom.ts

export async function connectWallet() {
  const { solana } = window
  
  if (!solana?.isPhantom) {
    console.error("Phantom wallet not installed")
    return null
  }

  try {
    const response = await solana.connect()
    const pubkey = response.publicKey.toString()
    return pubkey
  } catch (err) {
    console.error("Failed to connect wallet:", err)
    return null
  }
}

export function disconnectWallet() {
  const { solana } = window
  solana?.disconnect()
}
```

### Listen to Connection Changes

```typescript
export function listenToWalletChanges(callback: (pubkey: string | null) => void) {
  const { solana } = window
  
  if (!solana) return

  // Listen for connect
  solana.on('connect', () => {
    const pubkey = solana.publicKey?.toString()
    callback(pubkey || null)
  })

  // Listen for disconnect
  solana.on('disconnect', () => {
    callback(null)
  })
}
```

### Sign Transaction

```typescript
export async function signTransaction(transaction: Transaction) {
  const { solana } = window
  
  if (!solana) {
    throw new Error("Phantom wallet not available")
  }

  try {
    const signedTx = await solana.signTransaction(transaction)
    return signedTx
  } catch (err) {
    console.error("Failed to sign transaction:", err)
    throw err
  }
}

export async function signMessage(message: Buffer) {
  const { solana } = window
  
  if (!solana) {
    throw new Error("Phantom wallet not available")
  }

  try {
    const { signature } = await solana.signMessage(message)
    return signature
  } catch (err) {
    console.error("Failed to sign message:", err)
    throw err
  }
}
```

### Get Balance

```typescript
export async function getUSDCBalance(publicKey: PublicKey): Promise<number> {
  const connection = new Connection(
    `https://api.${process.env.NEXT_PUBLIC_SOLANA_NETWORK}.solana.com`
  )
  
  const usdcMint = new PublicKey(
    process.env.NEXT_PUBLIC_USDC_MINT || "EPjFWaLb3odcccccccccccccccccccccccccccccc"
  )

  try {
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: usdcMint
    })

    if (tokenAccounts.value.length === 0) {
      return 0
    }

    const tokenAccount = tokenAccounts.value[0]
    const balance = await connection.getTokenAccountBalance(tokenAccount.pubkey)
    
    return balance.value.uiAmount || 0
  } catch (err) {
    console.error("Failed to get USDC balance:", err)
    return 0
  }
}
```

## 🔐 X402 Payment Protocol

### Payment Challenge Generation

```typescript
// lib/x402/protocol.ts

import crypto from 'crypto'

export interface PaymentChallenge {
  nonce: string
  amount: number
  recipient: string
  expiresAt: Date
}

export function generateChallenge(
  amount: number,
  recipient: string
): PaymentChallenge {
  const nonce = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  return {
    nonce,
    amount,
    recipient,
    expiresAt
  }
}

export function generatePaymentHeader(
  challenge: PaymentChallenge,
  walletAddress: string
): string {
  const payload = JSON.stringify({
    challenge: challenge.nonce,
    amount: challenge.amount,
    recipient: challenge.recipient,
    walletAddress,
    timestamp: Date.now()
  })

  const signature = crypto
    .createHmac('sha256', process.env.X402_SECRET_KEY || '')
    .update(payload)
    .digest('hex')

  return signature
}

export function verifySignature(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.X402_SECRET_KEY || '')
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
}
```

### Handle Payment Request

```typescript
// hooks/usePayment.ts

import { useState } from 'react'
import { signTransaction, getUSDCBalance } from '@/lib/wallet/phantom'

export function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestPayment(amount: number, walletAddress: string) {
    setLoading(true)
    setError(null)

    try {
      // 1. Get payment challenge from server
      const challengeResponse = await fetch('/api/payment/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, walletAddress })
      })

      const { challenge } = await challengeResponse.json()

      // 2. Check balance before attempting payment
      const balance = await getUSDCBalance(new PublicKey(walletAddress))
      if (balance < amount) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`)
      }

      // 3. Create USDC transfer transaction
      const connection = new Connection(
        `https://api.${process.env.NEXT_PUBLIC_SOLANA_NETWORK}.solana.com`
      )

      const transaction = new Transaction()
      
      // Add transfer instruction (simplified)
      const usdcMint = new PublicKey(
        process.env.NEXT_PUBLIC_USDC_MINT || "EPjFWaLb3odcccccccccccccccccccccccccccccc"
      )

      // 4. Sign transaction with Phantom
      const signedTx = await signTransaction(transaction)

      // 5. Send transaction
      const txHash = await connection.sendRawTransaction(
        signedTx.serialize()
      )

      // 6. Wait for confirmation
      const confirmation = await connection.confirmTransaction(txHash)

      if (!confirmation.value.err) {
        // 7. Verify on server
        const verifyResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            transactionHash: txHash,
            amount,
            challenge: challenge.nonce
          })
        })

        const result = await verifyResponse.json()
        return result
      } else {
        throw new Error('Transaction failed on blockchain')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { requestPayment, loading, error }
}
```

## 🪝 Custom Hooks

### useWallet Hook

```typescript
// hooks/useWallet.ts

import { useEffect, useState } from 'react'
import {
  connectWallet,
  disconnectWallet,
  listenToWalletChanges,
  getUSDCBalance
} from '@/lib/wallet/phantom'
import { PublicKey } from '@solana/web3.js'

export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listenToWalletChanges(async (pubkey) => {
      setWallet(pubkey)
      if (pubkey) {
        await updateBalance(pubkey)
      } else {
        setBalance(0)
      }
    })
  }, [])

  async function updateBalance(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress)
      const bal = await getUSDCBalance(publicKey)
      setBalance(bal)
    } catch (err) {
      console.error('Failed to update balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to get balance')
    }
  }

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      const walletAddress = await connectWallet()
      setWallet(walletAddress)
      if (walletAddress) {
        await updateBalance(walletAddress)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    disconnectWallet()
    setWallet(null)
    setBalance(0)
  }

  return {
    wallet,
    balance,
    loading,
    error,
    connect,
    disconnect,
    updateBalance
  }
}
```

## 💬 UI Component Example

```typescript
// components/WalletConnect/WalletButton.tsx

import { useWallet } from '@/hooks/useWallet'
import { formatAddress, formatBalance } from '@/lib/utils/formatting'

export function WalletButton() {
  const { wallet, balance, loading, connect, disconnect } = useWallet()

  if (!wallet) {
    return (
      <button
        onClick={connect}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg text-white font-semibold hover:shadow-lg transition"
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        <span className="text-sm text-gray-400">{formatAddress(wallet)}</span>
        <span className="text-lg font-bold text-white">
          {formatBalance(balance)} USDC
        </span>
      </div>
      <button
        onClick={disconnect}
        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm transition"
      >
        Disconnect
      </button>
    </div>
  )
}
```

## 🔍 Network Configuration

### Environment Variables

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKiYtn89JHU1MgCJ7Hb3v9GhE1jdFyN  # devnet
X402_SECRET_KEY=your_secret_key_here
```

### Network Configurations

**Mainnet**:
```
RPC: https://api.mainnet-beta.solana.com
USDC Mint: EPjFWaLb3odcccccccccccccccccccccccccccccc
```

**Devnet**:
```
RPC: https://api.devnet.solana.com
USDC Mint: Gh9ZwEmdLJ8DscKiYtn89JHU1MgCJ7Hb3v9GhE1jdFyN
```

## 🧪 Testing

### Test Wallet Connection

```typescript
// __tests__/wallet.test.ts

import { connectWallet, getUSDCBalance } from '@/lib/wallet/phantom'

describe('Wallet Integration', () => {
  test('should connect to Phantom wallet', async () => {
    const address = await connectWallet()
    expect(address).toBeTruthy()
    expect(address).toMatch(/^[1-9A-HJ-NP-Z]{32,34}$/) // Solana address format
  })

  test('should get USDC balance', async () => {
    const address = await connectWallet()
    const balance = await getUSDCBalance(new PublicKey(address))
    expect(typeof balance).toBe('number')
    expect(balance >= 0).toBeTruthy()
  })
})
```

---

**Last Updated**: 2025-11-03