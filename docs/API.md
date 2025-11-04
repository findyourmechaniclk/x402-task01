# API Documentation

## Overview

All API endpoints require X402 protocol headers and payment verification. The API follows REST principles with JSON request/response format.

## 🔐 X402 Protocol Headers

Every request must include:
```
X-402-Payment-Required: true
X-402-Challenge: {challenge_nonce}
X-402-Signature: {signed_challenge}
X-402-Address: {wallet_address}
```

## 📡 Chat Endpoints

### POST /api/chat

Send a message and receive an AI response.

**Request:**
```json
{
  "message": "What is machine learning?",
  "model": "gpt-4o",
  "conversationId": "conv_123", // optional
  "stream": true
}
```

**Response (Non-Streaming):**
```json
{
  "success": true,
  "response": "Machine learning is...",
  "cost": {
    "amount": 0.03,
    "currency": "USDC",
    "tokens": {
      "input": 150,
      "output": 200
    }
  },
  "transactionHash": "5VxWD...",
  "timestamp": "2025-11-03T12:26:26Z"
}
```

**Response (Streaming):**
```
event: message
data: {"type": "token", "content": "Machine"}

event: message
data: {"type": "token", "content": " learning"}

event: done
data: {"cost": 0.03, "tokensUsed": 350}
```

**Status Codes:**
- `200`: Success
- `402`: Payment required
- `401`: Invalid payment signature
- `429`: Rate limit exceeded
- `500`: Server error

---

### GET /api/chat/history

Retrieve chat history for authenticated wallet.

**Query Parameters:**
```
?limit=50&offset=0&conversationId=conv_123
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "conversationId": "conv_123",
      "role": "user",
      "content": "What is AI?",
      "model": "gpt-4o",
      "timestamp": "2025-11-03T12:00:00Z",
      "cost": 0.01
    },
    {
      "id": "msg_124",
      "conversationId": "conv_123",
      "role": "assistant",
      "content": "AI is...",
      "model": "gpt-4o",
      "timestamp": "2025-11-03T12:00:05Z",
      "cost": 0.02
    }
  ],
  "total": 100,
  "hasMore": true
}
```

---

### DELETE /api/chat/:conversationId

Delete a conversation and all associated messages.

**Response:**
```json
{
  "success": true,
  "deletedMessages": 5,
  "deletedConversation": "conv_123"
}
```

---

## 💳 Payment Endpoints

### POST /api/payment/verify

Verify X402 payment and update balance.

**Request:**
```json
{
  "walletAddress": "7qLa...",
  "transactionHash": "5VxWD...",
  "amount": 0.03,
  "signature": "hex_signature"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "transactionHash": "5VxWD...",
  "amount": 0.03,
  "balance": 9.97,
  "timestamp": "2025-11-03T12:26:26Z"
}
```

---

### GET /api/payment/status

Get payment status for a transaction.

**Query Parameters:**
```
?transactionHash=5VxWD...&walletAddress=7qLa...
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "5VxWD...",
  "status": "confirmed",
  "amount": 0.03,
  "confirmations": 32,
  "timestamp": "2025-11-03T12:26:26Z"
}
```

**Status Values:**
- `pending`: Transaction sent to blockchain
- `confirmed`: Transaction confirmed
- `failed`: Transaction failed
- `expired`: Payment window expired

---

### GET /api/payment/balance

Get current USDC balance for wallet.

**Query Parameters:**
```
?walletAddress=7qLa...
```

**Response:**
```json
{
  "success": true,
  "walletAddress": "7qLa...",
  "balance": 9.97,
  "currency": "USDC",
  "lastUpdated": "2025-11-03T12:26:26Z"
}
```

---

## 🤖 Model Endpoints

### GET /api/models

List all available AI models with pricing.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4 Optimized",
      "provider": "openai",
      "pricing": {
        "perRequest": 0.03,
        "perToken": {
          "input": 0.00001,
          "output": 0.00003
        }
      },
      "capabilities": ["text", "reasoning"],
      "rateLimit": 60,
      "maxTokens": 4096,
      "available": true
    },
    {
      "id": "gemini-2.0",
      "name": "Gemini 2.0",
      "provider": "google",
      "pricing": {
        "perRequest": 0.01,
        "perToken": {
          "input": 0.000005,
          "output": 0.000015
        }
      },
      "capabilities": ["text", "image", "video"],
      "rateLimit": 100,
      "maxTokens": 32000,
      "available": true
    },
    {
      "id": "claude-3-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "pricing": {
        "perRequest": 0.02,
        "perToken": {
          "input": 0.000003,
          "output": 0.000015
        }
      },
      "capabilities": ["text", "analysis"],
      "rateLimit": 50,
      "maxTokens": 200000,
      "available": true
    }
  ]
}
```

---

### GET /api/models/:modelId

Get detailed information about a specific model.

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "gpt-4o",
    "name": "GPT-4 Optimized",
    "provider": "openai",
    "version": "2024-08-06",
    "description": "Most capable model from OpenAI",
    "pricing": {
      "perRequest": 0.03,
      "perToken": {
        "input": 0.00001,
        "output": 0.00003
      }
    },
    "capabilities": ["text", "reasoning", "vision"],
    "rateLimit": 60,
    "maxTokens": 4096,
    "contextWindow": 128000,
    "trainingData": "April 2024",
    "available": true
  }
}
```

---

## 👛 Wallet Endpoints

### GET /api/wallet/info

Get wallet information and balance.

**Query Parameters:**
```
?walletAddress=7qLa...
```

**Response:**
```json
{
  "success": true,
  "wallet": {
    "address": "7qLa...",
    "balance": {
      "usdc": 9.97,
      "sol": 0.5
    },
    "totalSpent": 50.03,
    "requestCount": 1503,
    "firstSeen": "2025-10-01T00:00:00Z",
    "lastActive": "2025-11-03T12:26:26Z"
  }
}
```

---

### POST /api/wallet/verify

Verify wallet ownership through signature.

**Request:**
```json
{
  "walletAddress": "7qLa...",
  "message": "Verify wallet ownership",
  "signature": "hex_signature"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "token": "jwt_token_for_session"
}
```

---

### GET /api/wallet/transactions

Get transaction history for wallet.

**Query Parameters:**
```
?walletAddress=7qLa...&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "tx_123",
      "hash": "5VxWD...",
      "amount": 0.03,
      "type": "chat_request",
      "model": "gpt-4o",
      "status": "confirmed",
      "timestamp": "2025-11-03T12:00:00Z"
    }
  ],
  "total": 1503,
  "totalSpent": 50.03
}
```

---

## 🔄 Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient USDC balance for this request",
    "details": {
      "required": 0.03,
      "available": 0.01
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_PAYMENT` | 402 | Payment verification failed |
| `INSUFFICIENT_BALANCE` | 402 | Not enough balance |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_MODEL` | 400 | Model not found |
| `INVALID_INPUT` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `SERVER_ERROR` | 500 | Internal server error |
| `MODEL_UNAVAILABLE` | 503 | Model temporarily unavailable |

---

## 🔒 Authentication

All endpoints use X402 protocol for authentication. Include X402 headers in every request:

```typescript
// Example request with X402 headers
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-402-Payment-Required': 'true',
    'X-402-Challenge': challenge,
    'X-402-Signature': signature,
    'X-402-Address': walletAddress,
  },
  body: JSON.stringify({
    message: 'Hello, AI!',
    model: 'gpt-4o'
  })
})
```

---

## 📊 Rate Limits

Per wallet address:
- **Chat requests**: 60 per hour
- **Model listing**: 100 per minute
- **Balance check**: 200 per minute
- **Transaction history**: 30 per minute

Rate limit headers in response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699002386
```

---

**Last Updated**: 2025-11-03