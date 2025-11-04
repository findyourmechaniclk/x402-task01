# Troubleshooting Guide

## 🔴 Common Issues & Solutions

### Wallet Connection Issues

#### Problem: "Phantom Wallet not found"

**Causes:**
- Phantom extension not installed
- Using unsupported browser
- Extension disabled

**Solutions:**
```typescript
// Add detection
const isPhantomAvailable = () => {
  const { solana } = window as any
  return solana && solana.isPhantom
}

// Show user-friendly message
if (!isPhantomAvailable()) {
  showError('Please install Phantom Wallet: https://phantom.app')
}
```

---

#### Problem: "User rejected connection"

**Causes:**
- User declined wallet connection
- Multiple connection attempts
- Network issues during connection

**Solutions:**
```typescript
// Add retry logic
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connectWallet()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}
```

---

### Payment Issues

#### Problem: "402 Payment Required" stuck

**Causes:**
- Insufficient USDC balance
- Payment signature invalid
- Network timeout during verification

**Solutions:**
```typescript
// Check balance before payment
const balance = await getUSDCBalance(walletAddress)
if (balance < requiredAmount) {
  showError(`Insufficient balance. Need ${requiredAmount} USDC, have ${balance}`)
  return
}

// Implement timeout
const timeoutId = setTimeout(() => {
  throw new Error('Payment timeout')
}, 30000)

try {
  await verifyPayment()
} finally {
  clearTimeout(timeoutId)
}
```

---

#### Problem: "Transaction failed on blockchain"

**Causes:**
- Insufficient SOL for gas fees
- Network congestion
- Invalid USDC token account

**Solutions:**
```typescript
// Check SOL balance for gas
const solBalance = await connection.getBalance(walletAddress)
if (solBalance < 5000) { // ~0.000005 SOL minimum
  showError('Insufficient SOL for gas fees. Please add SOL to your wallet.')
}

// Implement retry with backoff
async function sendTransactionWithRetry(tx, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connection.sendRawTransaction(tx.serialize())
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
}
```

---

### API Issues

#### Problem: "401 Unauthorized - Signature verification failed"

**Causes:**
- Incorrect signature format
- Wallet address mismatch
- Challenge expired

**Solutions:**
```typescript
// Verify signature format before sending
if (!signature.match(/^[0-9a-f]+$/i)) {
  showError('Invalid signature format')
  return
}

// Check challenge expiration
if (new Date() > challengeExpiry) {
  // Get new challenge
  const newChallenge = await getNewChallenge()
  return signAndRetry(newChallenge)
}

// Log for debugging
console.log('X402 Headers:', {
  challenge: request.headers.get('X-402-Challenge'),
  address: request.headers.get('X-402-Address'),
  signature: request.headers.get('X-402-Signature')?.slice(0, 10) + '...'
})
```

---

#### Problem: "Rate limit exceeded"

**Causes:**
- Too many requests in time window
- Multiple concurrent requests
- Polling too frequently

**Solutions:**
```typescript
// Implement client-side rate limiting
class RateLimiter {
  private requests: number[] = []
  
  constructor(private maxRequests: number, private timeWindow: number) {}
  
  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter(t => now - t < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }
}

const limiter = new RateLimiter(60, 3600000) // 60 per hour

if (!limiter.canMakeRequest()) {
  showError('Too many requests. Please wait before sending another message.')
}
```

---

### Model & Response Issues

#### Problem: "Model not available" or "503 Service Unavailable"

**Causes:**
- API key not configured
- Service temporarily down
- Invalid API credentials

**Solutions:**
```typescript
// Check model availability
async function checkModelAvailability(model: string) {
  const models = await fetch('/api/models').then(r => r.json())
  const modelInfo = models.find(m => m.id === model)
  
  if (!modelInfo?.available) {
    showError(`Model ${model} is currently unavailable. Try another.`)
    return false
  }
  return true
}

// Implement fallback
const fallbackModels = {
  'gpt-4o': 'gpt-4-turbo',
  'gemini-2.0': 'claude-3-sonnet'
}

async function getAvailableModel(preferred: string) {
  const available = await checkModelAvailability(preferred)
  if (available) return preferred
  return fallbackModels[preferred as keyof typeof fallbackModels]
}
```

---

#### Problem: "Streaming response cuts off"

**Causes:**
- Connection timeout
- Server crashed mid-stream
- Network interrupted

**Solutions:**
```typescript
// Add heartbeat during streaming
async function* streamResponse(reader: ReadableStreamDefaultReader) {
  const decoder = new TextDecoder()
  let lastChunk = Date.now()
  
  const heartbeatInterval = setInterval(() => {
    if (Date.now() - lastChunk > 30000) {
      throw new Error('Stream timeout - no data received for 30s')
    }
  }, 5000)
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      lastChunk = Date.now()
      yield decoder.decode(value)
    }
  } finally {
    clearInterval(heartbeatInterval)
  }
}
```

---

### Development Issues

#### Problem: "Environment variables not loading"

**Solutions:**
```bash
# 1. Verify .env.local exists (not gitignored)
ls -la .env.local

# 2. Check variable format
# Correct: NEXT_PUBLIC_VAR=value
# Wrong: export NEXT_PUBLIC_VAR=value

# 3. Restart dev server
npm run dev

# 4. Verify variables are accessible
console.log(process.env.NEXT_PUBLIC_SOLANA_NETWORK)
```

---

#### Problem: "TypeScript errors after changing types"

**Solutions:**
```bash
# Clear TypeScript cache
rm -rf .next

# Rebuild
npm run build

# Or use strict mode
# tsconfig.json: "strict": true
```

---

### Database Issues

#### Problem: "Failed to connect to database"

**Solutions:**
```typescript
// Add connection retry
async function connectDatabase(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await mongoose.connect(process.env.DATABASE_URL)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// Monitor connection
mongoose.connection.on('error', (err) => {
  logger.error('Database error:', err)
})

mongoose.connection.on('disconnected', () => {
  logger.warn('Database disconnected')
})
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

```typescript
// lib/utils/logger.ts
const DEBUG = process.env.DEBUG === 'true'

export const logger = {
  debug: (msg: string, data?: any) => {
    if (DEBUG) console.log(`[DEBUG] ${msg}`, data)
  },
  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${msg}`, data)
  },
  error: (msg: string, error?: any) => {
    console.error(`[ERROR] ${msg}`, error)
  }
}
```

### Browser DevTools

**Network Tab:**
- Check X402 headers in requests
- Verify response status codes
- Monitor streaming responses

**Console:**
- Look for JavaScript errors
- Check wallet connection logs
- Monitor API call responses

**Application Tab:**
- Check localStorage for cached data
- Verify environment variables are accessible
- Monitor session storage

### Server Logs

```bash
# Check Next.js server logs
npm run dev 2>&1 | grep -i "error\|warn"

# Monitor API responses
curl -v http://localhost:3000/api/models

# Test X402 headers
curl -H "X-402-Challenge: test" -H "X-402-Signature: sig" \
  -H "X-402-Address: addr" \
  http://localhost:3000/api/chat
```

---

## 📞 Getting Help

1. **Check logs** - Review browser console and server logs
2. **Enable debug mode** - Set `DEBUG=true` in `.env.local`
3. **Test in isolation** - Test wallet connection separately from chat
4. **Check configurations** - Verify `.env.local` values
5. **Review documentation** - Check relevant doc file
6. **Open issue** - If problem persists, open GitHub issue with:
   - Error message
   - Steps to reproduce
   - Browser/OS information
   - Relevant logs

---

**Last Updated**: 2025-11-03