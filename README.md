# X402 GPT - Pay-Per-Request AI Chatbot Platform

A Next.js-based AI chatbot platform powered by the X402 HTTP payment protocol, enabling instant cryptocurrency payments for AI model access using Phantom Wallet on Solana.

## 🌟 Features

- **Multiple AI Models**: OpenAI GPT, Google Gemini, Anthropic Claude
- **Pay-Per-Request**: X402 protocol implementation for seamless payments
- **Phantom Wallet Integration**: Solana-based USDC payments
- **Real-time Chat**: WebSocket support for streaming responses
- **Model Switching**: Easy switching between different AI providers
- **Cost Tracking**: Real-time cost calculation per request
- **Error Handling**: Graceful error management with user feedback

## 🏗️ Project Structure

```
x402-task1/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage
│   ├── chat/
│   │   ├── page.tsx            # Chat interface
│   │   └── layout.tsx          # Chat layout
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts        # Chat endpoint
│   │   │   └── stream.ts       # Streaming endpoint
│   │   ├── payment/
│   │   │   ├── verify.ts       # X402 verification
│   │   │   └── status.ts       # Payment status
│   │   ├── models/
│   │   │   └── route.ts        # Available models
│   │   └── wallet/
│   │       └── route.ts        # Wallet info
│   └── assets/
│       └── styles/
│           └── globals.css     # Global styles
├── components/
│   ├── ChatInterface/
│   │   ├── ChatBox.tsx
│   │   ├── MessageList.tsx
│   │   ├── InputArea.tsx
│   │   └── CostDisplay.tsx
│   ├── WalletConnect/
│   │   ├── WalletButton.tsx
│   │   ├── WalletInfo.tsx
│   │   └── PaymentModal.tsx
│   ├── ModelSelector/
│   │   ├── ModelDropdown.tsx
│   │   └── ModelCard.tsx
│   ├── Common/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   └── ErrorBoundary.tsx
│   └── Pricing/
│       ├── PricingCard.tsx
│       └── PricingTable.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts           # API client
│   │   ├── models.ts           # Model API handlers
│   │   └── payment.ts          # Payment logic
│   ├── utils/
│   │   ├── formatting.ts       # Format utilities
│   │   ├── validation.ts       # Input validation
│   │   └── constants.ts        # App constants
│   ├── wallet/
│   │   ├── phantom.ts          # Phantom wallet integration
│   │   └── solana.ts           # Solana blockchain interaction
│   └── x402/
│       ├── protocol.ts         # X402 protocol implementation
│       └── headers.ts          # X402 header utilities
├── hooks/
│   ├── useChat.ts              # Chat hook
│   ├── useWallet.ts            # Wallet hook
│   ├── usePayment.ts           # Payment hook
│   └── useCost.ts              # Cost calculation hook
├── types/
│   ├── chat.ts                 # Chat types
│   ├── wallet.ts               # Wallet types
│   ├── payment.ts              # Payment types
│   ├── models.ts               # Model types
│   └── api.ts                  # API types
├── config/
│   ├── models.ts               # Model configurations
│   ├── pricing.ts              # Pricing structure
│   └── constants.ts            # App constants
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   ├── models/
│   │   └── icons/
│   └── fonts/
├── docs/
│   ├── ARCHITECTURE.md         # System architecture
│   ├── API.md                  # API documentation
│   ├── WALLET.md               # Wallet integration guide
│   ├── PAYMENT_FLOW.md         # Payment flow explanation
│   ├── X402_PROTOCOL.md        # X402 protocol details
│   ├── DEPLOYMENT.md           # Deployment guide
│   ├── CONTRIBUTING.md         # Contribution guidelines
│   └── TROUBLESHOOTING.md      # Troubleshooting guide
├── .env.example                # Environment template
├── .env.local                  # Local environment (gitignored)
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind CSS config
├── next.config.ts              # Next.js config
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Phantom Wallet browser extension
- API keys for OpenAI, Google Gemini, and Claude

### Installation

```bash
# Clone the repository
git clone https://github.com/bytesquadlabs/x402-task1.git
cd x402-task1

# Install dependencies
npm install
# or
yarn install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Setup

See `.env.example` for required environment variables. You'll need:

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PHANTOM_APP_URL=
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
ANTHROPIC_API_KEY=
X402_SECRET_KEY=
DATABASE_URL=
```

## 💳 Payment Flow

1. **User connects Phantom Wallet** - Select/connect Solana wallet
2. **Select AI Model** - Choose from OpenAI, Gemini, or Claude
3. **Send Message** - Application displays cost in USDC
4. **X402 Payment Request** - Server sends X402 payment challenge
5. **User Approves Payment** - Phantom Wallet signs transaction
6. **Transaction Verification** - Server verifies Solana blockchain
7. **AI Request Execution** - Model processes request after payment confirmation
8. **Cost Tracking** - Update user's balance and transaction history

## 🔐 Security Considerations

- **Private Key Management**: Never store private keys client-side
- **API Key Protection**: Keep model API keys server-side only
- **CORS Configuration**: Restrict API calls to trusted origins
- **X402 Verification**: Always verify payment signatures server-side
- **Rate Limiting**: Implement request rate limiting per wallet
- **Input Validation**: Sanitize all user inputs
- **Environment Variables**: Use `.env.local` for sensitive data

## 📚 Documentation Files

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and component interaction
- **[API.md](./docs/API.md)** - Complete API endpoint documentation
- **[WALLET.md](./docs/WALLET.md)** - Phantom Wallet integration guide
- **[PAYMENT_FLOW.md](./docs/PAYMENT_FLOW.md)** - Detailed payment processing
- **[X402_PROTOCOL.md](./docs/X402_PROTOCOL.md)** - X402 protocol implementation
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment instructions
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - How to contribute
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🛠️ Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Blockchain**: Solana, Phantom Wallet, Web3.js
- **Payment**: X402 Protocol, USDC
- **AI Models**: OpenAI API, Google Gemini API, Anthropic Claude API
- **Styling**: Tailwind CSS 4
- **Development**: ESLint, TypeScript

## 📊 Model Pricing

See [docs/PAYMENT_FLOW.md](./docs/PAYMENT_FLOW.md) for detailed pricing per model:

| Model | Type | Cost per Request |
|-------|------|-----------------|
| GPT-4o | Text | $0.03 - $0.15 |
| GPT-4 Turbo | Text | $0.01 - $0.03 |
| Gemini 2.0 | Text/Image | $0.01 - $0.10 |
| Claude 3.5 Sonnet | Text | $0.01 - $0.05 |
| DALL-E 3 | Image | $0.10 - $0.20 |

## 🔄 API Endpoints

### Chat Endpoints
- `POST /api/chat/` - Send message and get response
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/[id]` - Delete chat

### Payment Endpoints
- `POST /api/payment/verify` - Verify X402 payment
- `GET /api/payment/status` - Get payment status

### Model Endpoints
- `GET /api/models/` - List available models
- `GET /api/models/[id]` - Get model details

### Wallet Endpoints
- `GET /api/wallet/info` - Get wallet information
- `POST /api/wallet/verify` - Verify wallet connection

## 🎨 UI/UX Features

### Homepage
- Hero section with feature overview
- Pricing information
- Model showcase
- Testimonials
- Call-to-action buttons

### Chat Interface
- Real-time message streaming
- Model selection dropdown
- Cost display before request
- Message history with timestamps
- User-friendly error messages
- Loading states and animations

### Wallet Integration
- Connect/Disconnect buttons
- Balance display (USDC)
- Transaction history
- Gas fee estimations

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines on how to contribute to this project.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, questions, or suggestions, please:
1. Check [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
2. Open a GitHub Issue
3. Contact: support@x402gpt.dev

## 🔗 Resources

- [X402 Protocol Specification](https://github.com/iden3/x402)
- [Solana Documentation](https://docs.solana.com/)
- [Phantom Wallet Docs](https://docs.phantom.app/)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [Google Gemini Docs](https://ai.google.dev/)
- [Claude API Docs](https://docs.anthropic.com/)

---

**Last Updated**: 2025-11-03  
**Version**: 0.1.0