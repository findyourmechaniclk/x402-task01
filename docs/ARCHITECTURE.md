# System Architecture

## 📐 Overview

The X402 GPT platform follows a client-server architecture with blockchain integration for payment verification.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Browser)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ React Pages  │  │ Components   │  │  Hooks & State     │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│         │                 │                      │          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Phantom Wallet Integration                         │   │
│  │   - Connect/Disconnect                               │   │
│  │   - Sign Transactions                                │   │
│  │   - Balance Display                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + WebSocket
┌──────────────────────────┴──────────────────────────────────┐
│                    API LAYER (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Route Handlers (/api/)                  │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌──────────────┐     │   │
│  │  │ /chat       │  │ /payment │  │ /wallet      │     │   │
│  │  └─────────────┘  └──────────┘  └──────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Business Logic Layer                         │   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │ X402 Protocol Handler                       │     │   │
│  │  │ - Payment Challenge Generation              │     │   │
│  │  │ - Signature Verification                    │     │   │
│  │  │ - Cost Calculation                          │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │ Model Orchestration                         │     │   │
│  │  │ - Route to OpenAI/Gemini/Claude             │     │   │
│  │  │ - Stream Processing                         │     │   │
│  │  │ - Error Handling                            │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────┬──────────────────┘
                       │                   │
                       ▼                   ▼
         ┌─────────────────────┐  ┌─────────────────────┐
         │  External APIs      │  │ Blockchain Layer    │
         ├─────────────────────┤  ├─────────────────────┤
         │ • OpenAI API        │  │ • Solana RPC        │
         │ • Google Gemini     │  │ • Transaction Verify│
         │ • Claude API        │  │ • USDC Balance      │
         │ • Image APIs        │  │ • Gas Fees          │
         └─────────────────────┘  └─────────────────────┘
```

## 🔄 Component Hierarchy

### Page Components

```
app/
├── page.tsx (Homepage)
│   ├── Hero Section
│   ├── Features Overview
│   ├── Pricing
│   ├── Testimonials
│   └── CTA
│
└── chat/page.tsx (Chat Page)
    ├── Header (Navbar)
    │   ├── Logo
    │   ├── Model Selector
    │   ├── Cost Display
    │   └── WalletButton
    │
    ├── ChatInterface
    │   ├── MessageList
    │   │   └── Message (repeating)
    │   │       ├── Avatar
    │   │       ├── Content
    │   │       └── Timestamp
    │   │
    │   └── InputArea
    │       ├── TextInput
    │       ├── AttachmentButton
    │       └── SendButton
    │
    └── Sidebar
        ├── ConversationList
        ├── NewChat Button
        └── Settings
```

## 🔐 Security Layers

### 1. Frontend Security
- Phantom Wallet handles private key management
- No sensitive data stored in localStorage
- CSRF tokens for state-changing operations
- Input validation and sanitization

### 2. Backend Security
- API key encryption and secure storage
- X402 signature verification on all requests
- Rate limiting per wallet address
- Request timeout limits
- SQL injection prevention (if using database)

### 3. Blockchain Verification
- Verify transaction on Solana chain
- Confirm USDC token transfer
- Validate wallet address ownership
- Check transaction finality

## 📊 Data Flow - Chat Request

```
1. User Types Message
   └─→ Frontend validates input

2. Display Cost
   └─→ API calculates cost based on model & message length

3. User Approves Payment
   └─→ Frontend displays payment modal

4. Generate X402 Challenge
   └─→ Backend creates payment challenge
   └─→ Send to frontend

5. Sign Transaction
   └─→ Phantom Wallet signs transaction
   └─→ Broadcast to Solana network

6. Verify Payment
   └─→ Backend verifies transaction on blockchain
   └─→ Check balance, finality, amount

7. Process AI Request
   └─→ Route to appropriate model (OpenAI/Gemini/Claude)
   └─→ Stream response back to client

8. Update UI
   └─→ Display response in chat
   └─→ Update balance and cost tracking
   └─→ Save to history
```

## 🗂️ File Organization Best Practices

### `/app` - Next.js App Router
- **Purpose**: Page routes and layouts
- **Structure**: Mirrors URL structure
- **Files**: `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`

### `/components` - Reusable UI Components
- **Organization**: By feature/domain
- **Naming**: PascalCase, descriptive names
- **Files**: Component + types + styles
- **Example**: 
  ```
  ChatInterface/
  ├── ChatInterface.tsx
  ├── ChatInterface.types.ts
  └── ChatInterface.module.css
  ```

### `/lib` - Business Logic & Utilities
- **`/api`**: API client and service functions
- **`/utils`**: Helper functions
- **`/wallet`**: Wallet integration logic
- **`/x402`**: X402 protocol implementation

### `/hooks` - Custom React Hooks
- **Naming**: Start with `use`
- **Purpose**: Encapsulate reusable component logic
- **Examples**: `useChat`, `useWallet`, `usePayment`

### `/types` - TypeScript Types
- **Organization**: By domain
- **Naming**: Describe what the type represents
- **Usage**: Shared across components and hooks

### `/config` - Configuration Files
- **Purpose**: Centralized configuration
- **Examples**: Model configs, pricing, constants
- **Pattern**: Export constants and configurations

## 🔌 Integration Points

### Phantom Wallet Integration
- Listen for `on('connect')` and `on('disconnect')`
- Request public key for wallet operations
- Sign transactions using `signTransaction()`
- Broadcast transactions to Solana network

### X402 Protocol Implementation
- Generate payment challenges with nonce
- Include challenge in response headers
- Verify client signatures server-side
- Check signature validity and expiration

### Model APIs
- OpenAI: REST API calls with streaming
- Gemini: REST API with streaming support
- Claude: REST API with streaming via Server-Sent Events

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────────┐
│          Domain / CDN (CloudFlare)       │
└─────────────────────┬────────────────────┘
                      │
        ┌─────────────┴────────────┐
        │                          │
    ┌───▼────────┐         ┌───────▼───┐
    │  Static    │         │  Next.js  │
    │  Assets    │         │  Server   │
    │  (images)  │         │  (Vercel) │
    └────────────┘         └───────────┘
                                 │
                   ┌─────────────┼────────────┐
                   │             │            │
              ┌────▼───┐   ┌─────▼─────┐  ┌───▼────┐
              │Database│   │ Redis     │  │ Secrets│
              │        │   │ Cache     │  │ Manager│
              └────────┘   └───────────┘  └────────┘
```

## 🔄 State Management Pattern

Use React hooks for state management:
- `useState`: Local component state
- `useContext`: Wallet and theme context
- `useReducer`: Complex chat state
- Custom hooks: Encapsulate domain logic

Example:
```typescript
// useChat.ts - Custom hook for chat logic
export const useChat = () => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  
  const sendMessage = async (message: string) => {
    // Implementation
  }
  
  return { messages, loading, sendMessage }
}
```

## 📈 Scalability Considerations

1. **Caching**: Use Redis for frequently accessed data
2. **Database**: Use MongoDB/PostgreSQL for chat history
3. **Queue System**: Bull/RabbitMQ for async processing
4. **Load Balancing**: Deploy multiple instances behind load balancer
5. **CDN**: CloudFlare for static assets and edge caching
6. **Rate Limiting**: Implement per-wallet rate limits

---

**Last Updated**: 2025-11-03