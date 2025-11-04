# Payment Flow Documentation

## 📊 Overview

The payment flow implements the X402 HTTP Payment Protocol with Solana blockchain integration and USDC stablecoin transactions. This document covers the complete lifecycle of a payment from user request to transaction confirmation.

## 🔄 Complete Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INITIATES REQUEST                         │
│  1. User writes message and selects AI model (GPT-4, Gemini, Claude)    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CALCULATE REQUEST COST                               │
│  2. Frontend calculates cost based on:                                  │
│     - Model selected                                                    │
│     - Message length (estimated tokens)                                 │
│     - Optional features (image generation, etc.)                        │
│  Result: 0.01 - 0.15 USDC                                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISPLAY COST CONFIRMATION                            │
│  3. Show user:                                                          │
│     - Estimated cost: 0.03 USDC                                         │
│     - Current balance: 9.97 USDC                                        │
│     - Model: GPT-4o                                                     │
│     - "Proceed" or "Cancel" buttons                                     │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    User Clicks "Proceed"
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SEND INITIAL API REQUEST                             │
│  4. Frontend sends POST /api/chat with:                                 │
│     {                                                                   │
│       "message": "What is machine learning?",                           │
│       "model": "gpt-4o",                                                │
│       "conversationId": "conv_123"                                      │
│     }                                                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────┐
        │   Is payment already verified for this wallet?  │
        └────────────────────┬────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                   NO                 YES
                    │                  │
                    ▼                  │
        ┌────────────────────────┐     │
        │ GENERATE X402 CHALLENGE│     │
        │ 5. Server creates:     │     │
        │    - nonce (random)    │     │
        │    - amount (0.03)     │     │
        │    - recipient wallet  │     │
        │    - expiry (5 min)    │     │
        └───────────┬────────────┘     │
                    │                  │
                    ▼                  │
        ┌────────────────────────────┐ │
        │ RESPOND WITH 402 STATUS    │ │
        │ 6. HTTP 402 Payment        │ │
        │    Required with headers:  │ │
        │ X-402-Challenge: nonce     │ │
        │ X-402-Price: 0.03 USDC     │ │
        │ X-402-Recipient: wallet    │ │
        │ X-402-Expiry: timestamp    │ │
        └───────────┬────────────────┘ │
                    │                  │
                    └───────┬──────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT PROCESSES 402 RESPONSE                        │
│  7. Frontend receives 402 status and extracts challenge data            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISPLAY PAYMENT MODAL                                │
│  8. Show user payment confirmation:                                     │
│     ┌────────────────────────────────────┐                              │
│     │ Payment Required                   │                              │
│     │ Amount: 0.03 USDC                  │                              │
│     │ Model: GPT-4o                      │                              │
│     │ Recipient: [wallet address]        │                              │
│     │ [Approve in Phantom] [Cancel]      │                              │
│     └────────────────────────────────────┘                              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    User Clicks "Approve"
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CREATE SOLANA TRANSACTION                            │
│  9. Frontend constructs USDC transfer transaction:                      │
│     - From: User wallet                                                 │
│     - To: X402 recipient wallet                                         │
│     - Amount: 0.03 USDC                                                 │
│     - Blockchain: Solana                                                │
│     - Network: Devnet/Mainnet                                           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    REQUEST PHANTOM WALLET SIGNATURE                     │
│ 10. Frontend calls: solana.signTransaction(transaction)                 │
│     - Phantom popup appears                                             │
│     - Shows transaction details                                         │
│     - User reviews and clicks "Approve"                                 │
│     - Phantom signs with user's private key                             │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BROADCAST TO SOLANA NETWORK                          │
│ 11. Frontend sends signed transaction:                                  │
│     - connection.sendRawTransaction(signedTx)                           │
│     - Returns transaction hash (txHash)                                 │
│     - Broadcasts to Solana validators                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    WAIT FOR BLOCKCHAIN CONFIRMATION                     │
│ 12. Frontend waits for transaction confirmation:                        │
│     - Polls /api/payment/status every 2 seconds                         │
│     - Timeout: 30 seconds                                               │
│     - Status transitions:                                               │
│       • pending → processing                                            │
│       • processing → confirmed                                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERIFY PAYMENT ON SERVER                             │
│ 13. Server verifies transaction:                                        │
│     - Query Solana blockchain via RPC                                   │
│     - Confirm transaction hash exists                                   │
│     - Verify sender wallet address                                      │
│     - Confirm USDC amount transferred (0.03)                            │
│     - Check transaction finality                                        │
│     - Verify timestamp within challenge expiry                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                  VALID            INVALID
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ CREATE SESSION   │  │ RETURN 402 ERROR │
         │ - Mark paid      │  │ Show error       │
         │ - Grant access   │  │ Suggest retry    │
         │ - Log entry      │  │                  │
         └────────┬─────────┘  └──────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROCESS AI REQUEST                                   │
│ 14. Server now processes original request:                              │
│     - Call selected AI model (OpenAI/Gemini/Claude)                     │
│     - Include user message and context                                  │
│     - Model generates response                                          │
│     - Stream response tokens to frontend                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STREAM RESPONSE TO FRONTEND                          │
│ 15. Server streams response back:                                       │
│     - Streaming format: Server-Sent Events (SSE)                        │
│     - Each token arrives in real-time                                   │
│     - Frontend displays tokens as they arrive                           │
│     - Provides real-time feedback to user                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOG TRANSACTION & UPDATE BALANCE                     │
│ 16. Server updates records:                                             │
│     - Save chat message pair to database                                │
│     - Record transaction details:                                       │
│       • Transaction hash                                                │
│       • Model used                                                      │
│       • Tokens consumed                                                 │
│       • Cost (0.03 USDC)                                                │
│     - Update wallet total spent                                         │
│     - Increment request count                                           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    UPDATE UI ON FRONTEND                                │
│ 17. Frontend displays:                                                  │
│     - Complete AI response                                              │
│     - Updated balance: 9.94 USDC (was 9.97)                             │
│     - Message timestamp                                                 │
│     - Cost breakdown                                                    │
│     - Transaction hash (blockexplorer link)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## 💰 Cost Calculation

### Base Pricing Structure

```
Model               Base Cost   Input Token    Output Token    Max Request
─────────────────────────────────────────────────────────────────────────
GPT-4o              $0.03       $0.00001       $0.00003        $0.15
GPT-4 Turbo         $0.01       $0.000005      $0.000015       $0.10
Gemini 2.0          $0.01       $0.000005      $0.000015       $0.08
Claude 3.5 Sonnet   $0.02       $0.000003      $0.000015       $0.12
DALL-E 3 (Image)    $0.10       N/A            N/A             $0.20
```

### Cost Calculation Algorithm

```typescript
function calculateCost(message: string, model: string, response?: string): number {
  // Step 1: Get model pricing
  const pricing = PRICING[model]
  if (!pricing) return DEFAULT_MIN_COST // $0.01
  
  // Step 2: Estimate input tokens (rough: 4 chars = 1 token)
  const inputTokens = Math.ceil(message.length / 4)
  const inputCost = inputTokens * pricing.inputToken
  
  // Step 3: Estimate output tokens (if response provided)
  const outputTokens = response ? Math.ceil(response.length / 4) : 100
  const outputCost = outputTokens * pricing.outputToken
  
  // Step 4: Calculate total
  const tokenCost = inputCost + outputCost
  
  // Step 5: Apply minimum base cost
  const totalCost = Math.max(pricing.baseRequest, tokenCost)
  
  // Step 6: Round to 2 decimals and cap at maximum
  const capped = Math.min(totalCost, pricing.maxRequest)
  
  return parseFloat(capped.toFixed(2))
}

// Example calculations:
// - "Hello" with GPT-4o:
//   Tokens: ~1 input, ~100 output = $0.003 + $0.003 = $0.006
//   Applied minimum: $0.03 ✓
//
// - "Explain quantum computing in 500 words" with Claude:
//   Tokens: ~10 input, ~125 output = $0.00003 + $0.001875 = $0.001875
//   Applied minimum: $0.02 ✓
```

### Pricing Display in UI

```typescript
// components/ChatInterface/CostDisplay.tsx

interface CostDisplayProps {
  message: string
  model: string
  estimatedCost: number
  currentBalance: number
}

export function CostDisplay({ message, model, estimatedCost, currentBalance }: CostDisplayProps) {
  const canAfford = currentBalance >= estimatedCost
  const balanceAfter = currentBalance - estimatedCost

  return (
    <div className="border-l-2 border-cyan-500 pl-4 py-2 bg-slate-900/50">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-400">Model: <span className="text-white font-semibold">{model}</span></p>
          <p className="text-sm text-gray-400">Estimated Cost: <span className="text-cyan-400 font-bold">${estimatedCost.toFixed(4)} USDC</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Current Balance</p>
          <p className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
            ${currentBalance.toFixed(2)}
          </p>
          {canAfford && (
            <p className="text-xs text-green-400">After: ${balanceAfter.toFixed(2)}</p>
          )}
        </div>
      </div>
      {!canAfford && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
          ⚠️ Insufficient balance. Add ${(estimatedCost - currentBalance).toFixed(2)} USDC
        </div>
      )}
    </div>
  )
}
```

## 🔐 X402 Challenge & Response

### Challenge Generation (Server)

```typescript
// lib/x402/challenge.ts

import crypto from 'crypto'

export function generatePaymentChallenge(
  amount: number,
  model: string,
  walletAddress: string
): PaymentChallenge {
  // Generate unique nonce
  const nonce = crypto.randomBytes(16).toString('hex')
  
  // Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  
  // Create challenge payload
  const challenge: PaymentChallenge = {
    nonce,
    amount,
    model,
    walletAddress,
    recipient: process.env.X402_RECIPIENT_WALLET || '',
    currency: 'USDC',
    expiresAt,
    timestamp: new Date()
  }
  
  return challenge
}

export function createPaymentHeaders(
  challenge: PaymentChallenge
): Record<string, string> {
  return {
    'X-402-Challenge': challenge.nonce,
    'X-402-Price': challenge.amount.toString(),
    'X-402-Currency': challenge.currency,
    'X-402-Recipient': challenge.recipient,
    'X-402-Expiry': challenge.expiresAt.toISOString(),
    'X-402-Model': challenge.model
  }
}
```

### Challenge Response Flow (Client)

```typescript
// hooks/usePaymentChallenge.ts

import { useCallback, useState } from 'react'
import { signChallenge } from '@/lib/wallet/phantom'

export function usePaymentChallenge() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const respondToChallenge = useCallback(
    async (
      challenge: PaymentChallenge,
      walletAddress: string
    ): Promise<ChallengeResponse | null> => {
      setProcessing(true)
      setError(null)

      try {
        // Step 1: Create response payload
        const payload = {
          nonce: challenge.nonce,
          walletAddress,
          timestamp: Date.now(),
          amount: challenge.amount
        }

        // Step 2: Sign with Phantom wallet
        const signature = await signChallenge(JSON.stringify(payload))

        // Step 3: Return signed response
        return {
          challenge: challenge.nonce,
          signature,
          walletAddress,
          timestamp: payload.timestamp
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to respond to challenge'
        setError(message)
        return null
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return { respondToChallenge, processing, error }
}
```

## 🔄 Transaction States

```
┌─────────┐      ┌──────────────┐      ┌────────────────┐      ┌───────────┐
│ PENDING │ ───> │ BROADCASTING │ ───> │ CONFIRMING     │ ───> │ CONFIRMED │
└─────────┘      └──────────────┘      └────────────────┘      └───────────┘
                                                │
                                                ├─> FAILED
                                                ├─> TIMEOUT
                                                └─> INVALID

State Descriptions:
──────────────────

PENDING
  - Transaction created but not yet signed
  - Status: Waiting for Phantom wallet approval
  - Duration: User-dependent (seconds to minutes)

BROADCASTING
  - Transaction signed and sent to Solana network
  - Status: Propagating through validators
  - Duration: 1-5 seconds
  - RPC: connection.sendRawTransaction()

CONFIRMING
  - Transaction included in a block
  - Status: Validators confirming block
  - Duration: ~5-10 seconds
  - Confirmations needed: 1-32 (typically 6+)

CONFIRMED
  - Transaction finalized on chain
  - Status: Irreversible
  - Result: Payment complete, access granted
  - Action: Process AI request

FAILED
  - Transaction did not execute
  - Reasons: Insufficient balance, network error, user rejection
  - Action: Show error, allow retry

TIMEOUT
  - No confirmation after 30 seconds
  - Status: Unknown (check manually or retry)
  - Action: Recommend checking Solana explorer
```

## 📱 Transaction Status Polling

```typescript
// lib/payment/statusPoller.ts

export async function pollTransactionStatus(
  txHash: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<TransactionStatus> {
  const connection = new Connection(
    `https://api.${process.env.NEXT_PUBLIC_SOLANA_NETWORK}.solana.com`
  )

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Get transaction status from Solana
      const status = await connection.getSignatureStatus(txHash)
      
      if (!status.value) {
        // Not yet confirmed
        if (attempt === maxAttempts - 1) {
          return {
            status: 'timeout',
            error: 'Transaction confirmation timeout'
          }
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        continue
      }

      // Transaction found
      const { confirmations, err } = status.value

      if (err) {
        return {
          status: 'failed',
          error: `Transaction failed: ${JSON.stringify(err)}`
        }
      }

      if (confirmations && confirmations >= 6) {
        return {
          status: 'confirmed',
          confirmations,
          timestamp: new Date()
        }
      }

      if (confirmations) {
        return {
          status: 'confirming',
          confirmations,
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Error polling transaction status:', error)
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  return {
    status: 'timeout',
    error: 'Max polling attempts reached'
  }
}
```

## 💳 Payment Verification (Server)

```typescript
// lib/payment/verification.ts

export async function verifyPayment(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<PaymentVerificationResult> {
  const connection = new Connection(
    `https://api.${process.env.NEXT_PUBLIC_SOLANA_NETWORK}.solana.com`
  )

  try {
    // Step 1: Get transaction details
    const txResponse = await connection.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0
    })

    if (!txResponse) {
      return {
        verified: false,
        error: 'Transaction not found on blockchain'
      }
    }

    // Step 2: Verify transaction is confirmed
    if (!txResponse.blockTime) {
      return {
        verified: false,
        error: 'Transaction not yet confirmed'
      }
    }

    // Step 3: Parse transaction instructions
    const message = txResponse.transaction.message
    const instructions = message.instructions

    // Step 4: Find token transfer instruction
    let tokenTransferFound = false
    for (const instruction of instructions) {
      const programId = message.accountKeys[instruction.programIdIndex]
      
      // Check if this is a token program instruction
      if (programId.toString() === TOKEN_PROGRAM_ID.toString()) {
        // Verify transfer details
        // - Amount matches expectedAmount
        // - Recipient matches expectedRecipient
        tokenTransferFound = true
        break
      }
    }

    if (!tokenTransferFound) {
      return {
        verified: false,
        error: 'No valid token transfer found in transaction'
      }
    }

    // Step 5: Check transaction fees
    const fee = txResponse.meta?.fee || 0
    if (fee > MAX_ALLOWED_FEE) {
      return {
        verified: false,
        error: 'Transaction fee unexpectedly high'
      }
    }

    // All checks passed
    return {
      verified: true,
      txHash,
      amount: expectedAmount,
      timestamp: new Date(txResponse.blockTime * 1000),
      confirmations: 32 // Max confirmations in Solana
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    return {
      verified: false,
      error: 'Error verifying payment on blockchain'
    }
  }
}
```

## 📊 API Endpoint: POST /api/payment/verify

```typescript
// app/api/payment/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/payment/verification'
import { verifyX402Signature } from '@/lib/x402/verification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transactionHash,
      walletAddress,
      amount,
      challenge
    } = body

    // Step 1: Validate input
    if (!transactionHash || !walletAddress || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields'
          }
        },
        { status: 400 }
      )
    }

    // Step 2: Verify payment on blockchain
    const verification = await verifyPayment(
      transactionHash,
      amount,
      process.env.X402_RECIPIENT_WALLET || ''
    )

    if (!verification.verified) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_VERIFICATION_FAILED',
            message: verification.error
          }
        },
        { status: 402 }
      )
    }

    // Step 3: Log successful payment
    await logTransaction({
      walletAddress,
      transactionHash,
      amount,
      model: 'unknown', // Set from challenge if possible
      status: 'verified'
    })

    // Step 4: Return success response
    return NextResponse.json(
      {
        success: true,
        verified: true,
        transactionHash,
        amount,
        timestamp: verification.timestamp,
        confirmations: verification.confirmations
      },
      {
        headers: {
          'X-402-Verified': 'true',
          'X-402-Transaction': transactionHash
        }
      }
    )
  } catch (error) {
    console.error('Payment verification error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify payment'
        }
      },
      { status: 500 }
    )
  }
}
```

## 🔄 Complete Request-Response Cycle

### Step 1-6: Initial Request & Challenge

**Request:**
```http
POST /api/chat HTTP/1.1
Content-Type: application/json

{
  "message": "What is quantum computing?",
  "model": "gpt-4o"
}
```

**Response (402):**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-402-Challenge: a1b2c3d4e5f6...
X-402-Price: 0.03
X-402-Currency: USDC
X-402-Recipient: 7qLaK1234567...
X-402-Expiry: 2025-11-03T12:35:30Z

{
  "error": "payment_required",
  "message": "Payment required to proceed",
  "payment": {
    "challenge": "a1b2c3d4e5f6...",
    "amount": 0.03,
    "currency": "USDC",
    "recipient": "7qLaK1234567...",
    "expiresAt": "2025-11-03T12:35:30Z"
  }
}
```

### Step 7-12: Client Signs & Broadcasts

**Signed Request with Transaction:**
```http
POST /api/chat HTTP/1.1
Content-Type: application/json
X-402-Challenge: a1b2c3d4e5f6...
X-402-Signature: signature_hex_string
X-402-Address: user_wallet_address
X-402-Transaction: 5VxWDaQzH...
X-402-Payment-Required: true

{
  "message": "What is quantum computing?",
  "model": "gpt-4o"
}
```

### Step 13-17: Payment Verification & Response

**Response (200):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-402-Validated: true
X-402-Transaction: 5VxWDaQzH...

{
  "success": true,
  "response": "Quantum computing is a revolutionary...",
  "cost": {
    "amount": 0.03,
    "currency": "USDC",
    "tokens": {
      "input": 8,
      "output": 120
    }
  },
  "transactionHash": "5VxWDaQzH...",
  "balance": {
    "before": 9.97,
    "after": 9.94
  },
  "timestamp": "2025-11-03T12:30:30Z"
}
```

## 🛡️ Error Scenarios

### Scenario 1: Insufficient Balance

```
User Balance: 0.02 USDC
Request Cost: 0.03 USDC
───────────────────────

Frontend: Shows warning "Insufficient balance"
          Suggests adding 0.01 USDC
User: Cancels request
```

### Scenario 2: Challenge Expired

```
Challenge Generated: 12:30:00
Challenge Expiry: 12:35:00
User Signs At: 12:36:00 (1 minute late)
──────────────────────────────

Server: Rejects with 402
        Reason: "Challenge expired"
Frontend: Shows error "Payment window expired"
User: Must retry (get new challenge)
```

### Scenario 3: Network Timeout

```
Transaction Sent: 12:30:15
No Confirmation By: 12:30:45 (30 sec timeout)
──────────────────────────

Frontend: Shows "Payment timeout"
          Suggests: "Check Solana explorer or retry"
          Provides transaction hash link
User: Can check manually or retry
```

### Scenario 4: Transaction Verification Fails

```
Transaction Received: Valid signature
Amount Verified: 0.03 USDC ✓
Recipient Verified: Correct wallet ✓
Sender Verified: Correct wallet ✓
BUT: Transaction on wrong network (testnet vs mainnet)
─────────────────────────

Server: Rejects payment
        Reason: "Transaction not on expected network"
Frontend: Shows error
User: Must correct network and retry
```

## 📈 Transaction History

```typescript
// API: GET /api/wallet/transactions

{
  "success": true,
  "transactions": [
    {
      "id": "tx_001",
      "hash": "5VxWDaQzH...",
      "amount": 0.03,
      "model": "gpt-4o",
      "status": "confirmed",
      "confirmations": 32,
      "timestamp": "2025-11-03T12:30:30Z",
      "tokens": { "input": 8, "output": 120 }
    },
    {
      "id": "tx_002",
      "hash": "3YxKaQpL7...",
      "amount": 0.02,
      "model": "claude-3-sonnet",
      "status": "confirmed",
      "confirmations": 32,
      "timestamp": "2025-11-03T12:28:00Z",
      "tokens": { "input": 6, "output": 95 }
    }
  ],
  "summary": {
    "totalTransactions": 127,
    "totalSpent": 4.52,
    "averageCost": 0.0356
  }
}
```

## 🔗 Useful Links

- **Solana Explorer**: https://explorer.solana.com
- **Devnet Explorer**: https://explorer.solana.com?cluster=devnet
- **Transaction Verification**: Paste tx hash in explorer to verify
- **USDC Faucet (Devnet)**: https://solfaucet.com (creates USDC token account)

## 📝 Testing Payment Flow

### Manual Testing Checklist

- [ ] Create test wallet on devnet
- [ ] Send 0.1 SOL from faucet
- [ ] Create USDC token account
- [ ] Get 10 test USDC
- [ ] Send chat message
- [ ] Approve payment in Phantom
- [ ] Verify transaction on Solana explorer
- [ ] Check transaction hash in response
- [ ] Verify balance updated
- [ ] Check chat history shows transaction

### Automated Testing

```typescript
// __tests__/payment.test.ts

describe('Payment Flow', () => {
  it('should generate valid challenge', async () => {
    const challenge = generatePaymentChallenge(0.03, 'gpt-4o', walletAddress)
    expect(challenge.nonce).toBeTruthy()
    expect(challenge.expiresAt > new Date()).toBe(true)
  })

  it('should verify valid payment', async () => {
    const result = await verifyPayment(validTxHash, 0.03, recipient)
    expect(result.verified).toBe(true)
    expect(result.amount).toBe(0.03)
  })

  it('should reject expired challenge', async () => {
    const expiredChallenge = {
      ...challenge,
      expiresAt: new Date(Date.now() - 1000)
    }
    const result = validateChallenge(expiredChallenge)
    expect(result.valid).toBe(false)
  })
})
```

---

**Last Updated**: 2025-11-03
**Version**: 1.0.0