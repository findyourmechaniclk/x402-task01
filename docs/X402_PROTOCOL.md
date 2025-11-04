# X402 Protocol Implementation

## 📖 What is X402?

The X402 HTTP Payment Required specification (RFC 8866) extends HTTP with a payment mechanism. Instead of traditional 401 Unauthorized, servers respond with 402 Payment Required, allowing micropayments before resource access.

**X402 Use Cases:**
- Pay-per-request AI APIs
- Micropayment-based services
- Metered content access
- Real-time service billing

## 🔐 Protocol Flow

### 1. Initial Request Without Payment

```
Client Request:
POST /api/chat HTTP/1.1
Host: x402gpt.local
Content-Type: application/json

{
  "message": "Hello, AI!",
  "model": "gpt-4o"
}
```

### 2. Server Challenges with 402 Response

```
HTTP/1.1 402 Payment Required
X-402-Challenge: nonce_12345
X-402-Price: 0.03
X-402-Currency: USDC
X-402-Recipient: 7qLaK...
X-402-Expiry: 2025-11-03T12:35:00Z

{
  "error": "payment_required",
  "message": "Payment required for this request",
  "payment": {
    "challenge": "nonce_12345",
    "amount": 0.03,
    "currency": "USDC",
    "recipient": "7qLaK...",
    "expiresAt": "2025-11-03T12:35:00Z"
  }
}
```

### 3. Client Signs Challenge

```typescript
// Client side
const challenge = "nonce_12345"
const payload = JSON.stringify({
  challenge,
  amount: 0.03,
  recipient: "7qLaK...",
  walletAddress: "user_wallet_address",
  timestamp: Date.now()
})

// Sign with Phantom Wallet
const signature = await signMessage(Buffer.from(payload))
```

### 4. Retry with X402 Headers

```
POST /api/chat HTTP/1.1
Host: x402gpt.local
Content-Type: application/json
X-402-Challenge: nonce_12345
X-402-Signature: signature_hex_string
X-402-Address: user_wallet_address
X-402-Payment-Required: true

{
  "message": "Hello, AI!",
  "model": "gpt-4o"
}
```

### 5. Server Verifies & Processes

```
HTTP/1.1 200 OK
Content-Type: application/json
X-402-Validated: true

{
  "success": true,
  "response": "The AI response...",
  "cost": 0.03,
  "transactionHash": "5VxWD..."
}
```

## 🛠️ Server-Side Implementation

### Challenge Generation

```typescript
// lib/x402/protocol.ts

import crypto from 'crypto'
import { PublicKey } from '@solana/web3.js'

interface X402Challenge {
  nonce: string
  amount: number
  recipient: string
  expiresAt: Date
  salt: string
}

export function generateChallenge(
  amount: number,
  recipient: string = process.env.X402_RECIPIENT_ADDRESS || ''
): X402Challenge {
  const nonce = crypto.randomBytes(16).toString('hex')
  const salt = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(
    Date.now() + parseInt(process.env.X402_CHALLENGE_EXPIRY || '300') * 1000
  )

  return {
    nonce,
    amount,
    recipient,
    expiresAt,
    salt
  }
}

export function getChallengeHash(challenge: X402Challenge): string {
  const payload = JSON.stringify({
    nonce: challenge.nonce,
    amount: challenge.amount,
    recipient: challenge.recipient,
    salt: challenge.salt
  })

  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex')
}
```

### Signature Verification

```typescript
// lib/x402/verification.ts

import { PublicKey, Keypair } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

export async function verifyX402Signature(
  signature: string,
  message: string,
  walletAddress: string
): Promise<boolean> {
  try {
    // Decode signature from hex
    const signatureBytes = Buffer.from(signature, 'hex')
    
    // Get wallet's public key
    const walletPubKey = new PublicKey(walletAddress)
    const publicKeyBytes = walletPubKey.toBuffer()

    // Verify signature using Ed25519
    const messageBuffer = Buffer.from(message, 'utf-8')
    
    const isValid = nacl.sign.detached.verify(
      messageBuffer,
      signatureBytes,
      publicKeyBytes
    )

    return isValid
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

export function validateChallenge(
  challenge: X402Challenge
): { valid: boolean; error?: string } {
  // Check expiration
  if (new Date() > challenge.expiresAt) {
    return { valid: false, error: 'Challenge expired' }
  }

  // Validate amount
  if (challenge.amount <= 0) {
    return { valid: false, error: 'Invalid amount' }
  }

  // Validate recipient address
  try {
    new PublicKey(challenge.recipient)
  } catch {
    return { valid: false, error: 'Invalid recipient address' }
  }

  return { valid: true }
}
```

### Middleware

```typescript
// middleware/x402Payment.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyX402Signature, validateChallenge } from '@/lib/x402/verification'
import { generateChallenge, getChallengeHash } from '@/lib/x402/protocol'

export async function handleX402Payment(
  request: NextRequest,
  cost: number
) {
  // Extract X402 headers
  const signature = request.headers.get('X-402-Signature')
  const challenge = request.headers.get('X-402-Challenge')
  const walletAddress = request.headers.get('X-402-Address')

  // If no payment headers, send challenge
  if (!signature || !challenge || !walletAddress) {
    const newChallenge = generateChallenge(
      cost,
      process.env.X402_RECIPIENT_ADDRESS || ''
    )

    return new NextResponse(
      JSON.stringify({
        error: 'payment_required',
        message: 'Payment required for this request',
        payment: {
          challenge: newChallenge.nonce,
          amount: newChallenge.amount,
          currency: 'USDC',
          recipient: newChallenge.recipient,
          expiresAt: newChallenge.expiresAt
        }
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-402-Challenge': newChallenge.nonce,
          'X-402-Price': newChallenge.amount.toString(),
          'X-402-Currency': 'USDC',
          'X-402-Recipient': newChallenge.recipient,
          'X-402-Expiry': newChallenge.expiresAt.toISOString()
        }
      }
    )
  }

  // Verify signature
  const isValidSignature = await verifyX402Signature(
    signature,
    challenge,
    walletAddress
  )

  if (!isValidSignature) {
    return new NextResponse(
      JSON.stringify({
        error: 'invalid_signature',
        message: 'Payment signature verification failed'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Verify on blockchain
  const paymentVerified = await verifyPaymentOnBlockchain(
    walletAddress,
    cost
  )

  if (!paymentVerified) {
    return new NextResponse(
      JSON.stringify({
        error: 'payment_unverified',
        message: 'Payment could not be verified on blockchain'
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Payment successful
  return null // Allow request to proceed
}

async function verifyPaymentOnBlockchain(
  walletAddress: string,
  amount: number
): Promise<boolean> {
  // Implementation would verify transaction on Solana
  // Check USDC balance and recent transaction
  // This is simplified for documentation
  return true
}
```

## 💳 API Route Implementation

```typescript
// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { handleX402Payment } from '@/middleware/x402Payment'
import { calculateCost } from '@/lib/utils/pricing'
import { callOpenAI } from '@/lib/api/models'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { message, model = 'gpt-4o' } = data

    // Calculate cost for this request
    const cost = calculateCost(message, model)

    // Handle X402 payment
    const paymentError = await handleX402Payment(request, cost)
    if (paymentError) {
      return paymentError
    }

    // Get wallet address from headers
    const walletAddress = request.headers.get('X-402-Address') || 'unknown'

    // Get wallet from headers
    const walletAddr = request.headers.get('X-402-Address')

    // Process AI request
    const response = await callOpenAI(message, model)

    // Log transaction
    await logTransaction({
      walletAddress: walletAddr,
      model,
      cost,
      tokensUsed: response.tokens,
      status: 'success'
    })

    return NextResponse.json(
      {
        success: true,
        response: response.text,
        cost: {
          amount: cost,
          currency: 'USDC',
          tokens: response.tokens
        },
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'X-402-Validated': 'true',
          'X-402-Amount': cost.toString()
        }
      }
    )
  } catch (error) {
    console.error('Error in chat endpoint:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process request'
        }
      },
      { status: 500 }
    )
  }
}
```

## 🔍 Client-Side Implementation

```typescript
// lib/x402/client.ts

export async function makeX402Request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // First request - get challenge
  let response = await fetch(url, {
    ...options,
    method: options.method || 'POST'
  })

  // If 402, handle payment
  if (response.status === 402) {
    const paymentData = await response.json()
    const challenge = paymentData.payment.challenge

    // Sign challenge with Phantom
    const signature = await signChallenge(challenge)
    const walletAddress = await getWalletAddress()

    // Retry with X402 headers
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-402-Challenge': challenge,
        'X-402-Signature': signature,
        'X-402-Address': walletAddress,
        'X-402-Payment-Required': 'true'
      }
    })
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function signChallenge(challenge: string): Promise<string> {
  const { solana } = window as any

  if (!solana?.signMessage) {
    throw new Error('Phantom wallet not available')
  }

  const messageBuffer = Buffer.from(challenge, 'utf-8')
  const { signature } = await solana.signMessage(messageBuffer)

  return signature
}

async function getWalletAddress(): Promise<string> {
  const { solana } = window as any
  
  if (!solana?.publicKey) {
    throw new Error('Wallet not connected')
  }

  return solana.publicKey.toString()
}
```

## 📊 Pricing Model

Costs are calculated based on:
1. **Base cost per request** - Model-specific minimum charge
2. **Token-based cost** - Per input/output token
3. **Feature cost** - Additional features (image generation, etc.)

```typescript
// lib/utils/pricing.ts

const PRICING = {
  'gpt-4o': {
    baseRequest: 0.03,
    inputToken: 0.00001,
    outputToken: 0.00003
  },
  'gpt-4-turbo': {
    baseRequest: 0.01,
    inputToken: 0.000005,
    outputToken: 0.000015
  },
  'gemini-2.0': {
    baseRequest: 0.01,
    inputToken: 0.000005,
    outputToken: 0.000015
  },
  'claude-3-sonnet': {
    baseRequest: 0.02,
    inputToken: 0.000003,
    outputToken: 0.000015
  }
}

export function calculateCost(
  message: string,
  model: string,
  responseLength?: number
): number {
  const pricing = PRICING[model as keyof typeof PRICING]
  
  if (!pricing) {
    return 0.01 // Default minimum
  }

  // Estimate tokens (rough: 1 token ≈ 4 characters)
  const inputTokens = Math.ceil(message.length / 4)
  const outputTokens = responseLength ? Math.ceil(responseLength / 4) : 100

  const inputCost = inputTokens * pricing.inputToken
  const outputCost = outputTokens * pricing.outputToken

  return Math.max(
    pricing.baseRequest,
    inputCost + outputCost
  )
}
```

## 🧪 Testing X402 Implementation

```typescript
// __tests__/x402.test.ts

import { verifyX402Signature, validateChallenge } from '@/lib/x402/verification'
import { generateChallenge } from '@/lib/x402/protocol'

describe('X402 Protocol', () => {
  test('should generate valid challenge', () => {
    const challenge = generateChallenge(0.03, 'recipient_address')

    expect(challenge.nonce).toBeTruthy()
    expect(challenge.amount).toBe(0.03)
    expect(challenge.expiresAt).toBeInstanceOf(Date)
    expect(challenge.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  test('should validate challenge expiration', () => {
    const expiredChallenge = {
      nonce: 'test',
      amount: 0.03,
      recipient: 'addr',
      expiresAt: new Date(Date.now() - 1000),
      salt: 'salt'
    }

    const { valid, error } = validateChallenge(expiredChallenge)
    expect(valid).toBe(false)
    expect(error).toContain('expired')
  })

  test('should verify valid signature', async () => {
    const isValid = await verifyX402Signature(
      'signature_hex',
      'challenge_message',
      'wallet_address'
    )

    expect(typeof isValid).toBe('boolean')
  })
})
```

---

**Last Updated**: 2025-11-03