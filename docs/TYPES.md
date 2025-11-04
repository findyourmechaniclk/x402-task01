# TypeScript Type Definitions

This guide documents the main TypeScript types used throughout the application.

## 📝 Chat Types

```typescript
// types/chat.ts

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string
  tokens?: {
    input: number
    output: number
  }
  cost: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  walletAddress: string
  title: string
  model: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  totalCost: number
  messageCount: number
}

export interface ChatRequest {
  message: string
  model: string
  conversationId?: string
  stream?: boolean
  systemPrompt?: string
}

export interface ChatResponse {
  success: boolean
  response: string
  cost: {
    amount: number
    currency: 'USDC'
    tokens: {
      input: number
      output: number
    }
  }
  transactionHash?: string
  timestamp: string
  error?: {
    code: string
    message: string
  }
}

export interface StreamMessage {
  type: 'token' | 'done' | 'error'
  content?: string
  cost?: number
  error?: string
}
```

## 💳 Payment Types

```typescript
// types/payment.ts

export interface PaymentChallenge {
  nonce: string
  amount: number
  recipient: string
  expiresAt: Date
  salt?: string
}

export interface PaymentRequest {
  walletAddress: string
  transactionHash: string
  amount: number
  challenge: string
  signature?: string
}

export interface PaymentVerification {
  success: boolean
  verified: boolean
  transactionHash: string
  amount: number
  balance: number
  timestamp: string
  error?: {
    code: string
    message: string
  }
}

export interface Transaction {
  id: string
  walletAddress: string
  hash: string
  amount: number
  type: 'chat' | 'image' | 'other'
  model?: string
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  timestamp: Date
}

export interface WalletBalance {
  usdc: number
  sol: number
  lastUpdated: Date
}
```

## 👛 Wallet Types

```typescript
// types/wallet.ts

export interface WalletState {
  address: string | null
  connected: boolean
  loading: boolean
  error: string | null
}

export interface WalletInfo {
  address: string
  balance: WalletBalance
  totalSpent: number
  requestCount: number
  firstSeen: Date
  lastActive: Date
}

export interface ConnectWalletResponse {
  success: boolean
  address?: string
  error?: string
}

export interface DisconnectWalletResponse {
  success: boolean
}

export interface SignMessageRequest {
  message: Buffer | string
}

export interface SignMessageResponse {
  signature: string
}

export interface SignTransactionRequest {
  transaction: any // Solana Transaction
}

export interface SignTransactionResponse {
  signature: string
}
```

## 🤖 Model Types

```typescript
// types/models.ts

export interface ModelConfig {
  id: string
  name: string
  provider: 'openai' | 'google' | 'anthropic'
  version: string
  description: string
  capabilities: string[]
  pricing: {
    baseRequest: number
    perToken: {
      input: number
      output: number
    }
  }
  limits: {
    maxTokens: number
    contextWindow: number
    rateLimit: number
  }
  available: boolean
  deprecated?: boolean
}

export interface ModelResponse {
  success: boolean
  models: ModelConfig[]
  error?: {
    code: string
    message: string
  }
}

export interface ModelCallOptions {
  model: string
  message: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ModelCallResult {
  text: string
  tokens: {
    input: number
    output: number
  }
  model: string
  finishReason: string
}
```

## 🔐 X402 Types

```typescript
// types/x402.ts

export interface X402Headers {
  'X-402-Challenge'?: string
  'X-402-Signature'?: string
  'X-402-Address'?: string
  'X-402-Payment-Required'?: string
  'X-402-Price'?: string
  'X-402-Currency'?: string
  'X-402-Recipient'?: string
  'X-402-Expiry'?: string
  'X-402-Validated'?: string
}

export interface X402Challenge {
  nonce: string
  amount: number
  recipient: string
  expiresAt: Date
  salt: string
}

export interface X402PaymentData {
  challenge: string
  amount: number
  currency: string
  recipient: string
  expiresAt: string
}

export interface X402Error {
  error: string
  message: string
  payment?: X402PaymentData
}
```

## 📊 API Types

```typescript
// types/api.ts

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
}

export interface ApiError {
  code: string
  message: string
  status: number
  details?: Record<string, any>
}

export interface PaginatedResponse<T> {
  success: boolean
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}
```

## 🎨 Component Props

```typescript
// types/components.ts

export interface ChatInterfaceProps {
  model?: string
  onModelChange?: (model: string) => void
  onCostChange?: (cost: number) => void
}

export interface WalletButtonProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
  onConnect?: (address: string) => void
  onDisconnect?: () => void
}

export interface MessageListProps {
  messages: Message[]
  loading?: boolean
  onRetry?: (messageId: string) => void
}

export interface InputAreaProps {
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  onSend: (message: string) => Promise<void>
  onCancel?: () => void
}

export interface ModelSelectorProps {
  selectedModel: string
  models: ModelConfig[]
  onSelect: (modelId: string) => void
  disabled?: boolean
}
```

---

**Last Updated**: 2025-11-03