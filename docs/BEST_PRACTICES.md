# Best Practices Guide

## 🎯 Frontend Development

### 1. Component Organization

**Do:**
- Keep components small and focused on single responsibility
- Use descriptive names (ChatInterface, not ChatComp)
- Co-locate types with components

```typescript
// components/ChatInterface/ChatInterface.tsx
import type { ChatInterfaceProps } from './ChatInterface.types'

export const ChatInterface: React.FC<ChatInterfaceProps> = (props) => {
  return <div>{/* ... */}</div>
}
```

**Don't:**
- Create massive components with multiple concerns
- Use single-letter variable names
- Inline complex types in component files

### 2. State Management

**Do:**
- Use custom hooks to encapsulate domain logic
- Lift state only when necessary
- Use Context for global state (theme, wallet)

```typescript
// hooks/useChat.ts
export const useChat = () => {
  const [messages, setMessages] = useState([])
  
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg])
  }, [])
  
  return { messages, addMessage }
}
```

**Don't:**
- Store API keys in client state
- Keep sensitive data in localStorage
- Use global state for component-specific state

### 3. Performance Optimization

**Do:**
- Use `React.memo` for expensive components
- Implement `useCallback` for event handlers
- Lazy load routes with `React.lazy`

```typescript
const ChatPage = React.lazy(() => import('./ChatPage'))

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatPage />
    </Suspense>
  )
}
```

**Don't:**
- Create inline functions in render
- Render large lists without virtualization
- Load all data on app startup

### 4. Error Handling

**Do:**
- Use Error Boundary for component errors
- Show user-friendly error messages
- Log errors for debugging

```typescript
// components/Common/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    console.error('Error caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

**Don't:**
- Silently catch and ignore errors
- Show technical error messages to users
- Forget to log errors for debugging

---

## 🔒 Backend Security

### 1. API Authentication

**Do:**
- Always verify X402 signatures server-side
- Implement rate limiting per wallet
- Use HTTPS only in production

```typescript
// middleware/verifyX402.ts
export async function verifyX402(request: Request) {
  const signature = request.headers.get('X-402-Signature')
  const challenge = request.headers.get('X-402-Challenge')
  const address = request.headers.get('X-402-Address')

  if (!isValidSignature(signature, challenge, address)) {
    return new Response('Unauthorized', { status: 401 })
  }

  return null // valid
}
```

**Don't:**
- Trust client-side validation only
- Expose API keys in responses
- Log sensitive information

### 2. Data Protection

**Do:**
- Encrypt sensitive data in database
- Use parameterized queries for databases
- Validate and sanitize all inputs

```typescript
// API route example
import { sanitizeInput } from '@/lib/utils/validation'

export async function POST(request: Request) {
  const data = await request.json()
  const cleanMessage = sanitizeInput(data.message)
  
  // Safe to use in database query
}
```

**Don't:**
- Store passwords or keys in plaintext
- Use string concatenation for SQL queries
- Trust user input without validation

### 3. External API Calls

**Do:**
- Implement timeouts for API calls
- Use exponential backoff for retries
- Cache responses appropriately

```typescript
// lib/api/client.ts
async function fetchWithTimeout(url: string, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**Don't:**
- Make unbounded API calls
- Block request handlers indefinitely
- Retry without backoff

### 4. Environment Variables

**Do:**
- Use `.env.local` for secrets (gitignored)
- Prefix public variables with `NEXT_PUBLIC_`
- Validate required variables on startup

```typescript
// lib/config/env.ts
export const config = {
  solanaNetwork: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  apiKey: process.env.API_KEY, // Never prefix this!
}

// Validate at startup
if (!config.apiKey) {
  throw new Error('Missing required API_KEY')
}
```

**Don't:**
- Commit `.env.local` or secrets
- Prefix all variables with `NEXT_PUBLIC_`
- Mix sensitive and public variables

---

## 🎨 UI/UX Best Practices

### 1. Responsive Design

**Do:**
- Use Tailwind's responsive prefixes
- Test on multiple screen sizes
- Prioritize mobile experience

```typescript
// Good responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

**Don't:**
- Hardcode pixel values
- Ignore mobile viewport
- Break layout on smaller screens

### 2. Accessibility

**Do:**
- Use semantic HTML elements
- Include ARIA labels
- Ensure keyboard navigation

```typescript
<button
  aria-label="Send message"
  onClick={handleSend}
  className="hover:bg-blue-600"
>
  Send
</button>
```

**Don't:**
- Use `<div>` for everything
- Forget alt text for images
- Ignore color contrast ratios

### 3. Loading States

**Do:**
- Show loading indicators
- Disable buttons during requests
- Provide feedback

```typescript
<button
  disabled={loading}
  className={loading ? 'opacity-50 cursor-not-allowed' : ''}
>
  {loading ? 'Sending...' : 'Send'}
</button>
```

**Don't:**
- Freeze UI without feedback
- Allow multiple submissions
- Show no indication of progress

---

## 🧪 Testing

### 1. Unit Tests

**Do:**
- Test pure functions and hooks
- Mock external dependencies
- Use meaningful test descriptions

```typescript
// __tests__/formatBalance.test.ts
describe('formatBalance', () => {
  it('should format balance with correct decimal places', () => {
    expect(formatBalance(100.123456)).toBe('100.12')
  })

  it('should handle zero balance', () => {
    expect(formatBalance(0)).toBe('0.00')
  })
})
```

### 2. Integration Tests

**Do:**
- Test component interactions
- Mock API responses
- Simulate user workflows

```typescript
// __tests__/ChatInterface.test.tsx
describe('ChatInterface', () => {
  it('should send message on button click', async () => {
    const { getByText, getByPlaceholderText } = render(<ChatInterface />)
    
    const input = getByPlaceholderText('Type message...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(getByText('Send'))
    
    expect(mockApiCall).toHaveBeenCalled()
  })
})
```

---

## 📊 Performance Optimization

### 1. Code Splitting

```typescript
// Route-based code splitting
const ChatPage = dynamic(() => import('./ChatPage'), {
  loading: () => <LoadingSpinner />
})
```

### 2. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={100}
  height={100}
  priority={false}
/>
```

### 3. Caching Strategies

```typescript
// Cache API responses
const cacheResponse = (data, key, duration = 300000) => {
  cache[key] = { data, expiry: Date.now() + duration }
}

const getCached = (key) => {
  const cached = cache[key]
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  delete cache[key]
  return null
}
```

---

## 🚀 Deployment

### 1. Production Checklist

- [ ] Remove `mock_payments` flag
- [ ] Update environment variables to production values
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Test payment flow with real transactions

### 2. Error Handling in Production

```typescript
// lib/api/errorHandler.ts
export function handleError(error: unknown, context: string) {
  if (error instanceof ValidationError) {
    return { status: 400, message: 'Invalid input' }
  }
  
  if (error instanceof PaymentError) {
    return { status: 402, message: 'Payment failed' }
  }
  
  // Log unexpected errors
  logger.error(`Unexpected error in ${context}`, error)
  
  return { status: 500, message: 'Internal server error' }
}
```

---

**Last Updated**: 2025-11-03