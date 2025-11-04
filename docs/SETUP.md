# Setup & Installation Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.17 or higher
- **npm** 9.0 or higher (or yarn/pnpm)
- **Phantom Wallet** browser extension
- **API Keys** for OpenAI, Gemini, and Claude

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/bytesquadlabs/x402-task1.git
cd x402-task1

# 2. Install dependencies
npm install
# or
yarn install
# or
pnpm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with your API keys and settings
nano .env.local

# 5. Start development server
npm run dev
# or
yarn dev
```

**Access the application**: http://localhost:3000

---

## 🔧 Environment Configuration

### 1. Create `.env.local`

```bash
cp .env.example .env.local
```

### 2. Get Required API Keys

#### OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Create new secret key
- Add to `.env.local`:
```
OPENAI_API_KEY=sk_test_...
```

#### Google Gemini API Key
- Visit: https://ai.google.dev/
- Create API key
- Add to `.env.local`:
```
GOOGLE_GEMINI_API_KEY=AIzaSy...
```

#### Anthropic Claude API Key
- Visit: https://console.anthropic.com/
- Create API key
- Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Configure Solana Network

Choose network for testing:

**For Development (Devnet):**
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKiYtn89JHU1MgCJ7Hb3v9GhE1jdFyN
```

**For Production (Mainnet):**
```env
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_USDC_MINT=EPjFWaLb3odcccccccccccccccccccccccccccccc
```

### 4. Generate X402 Secret

```bash
# Generate random secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:
```
X402_SECRET_KEY=generated_hex_string
```

---

## 📦 Dependencies Overview

### Core Dependencies
```json
{
  "react": "19.2.0",           // UI library
  "react-dom": "19.2.0",       // React DOM
  "next": "16.0.1"             // Framework
}
```

### Dev Dependencies
```json
{
  "typescript": "^5",           // Type checking
  "tailwindcss": "^4",          // Styling
  "eslint": "^9"                // Code linting
}
```

### Additional Required

You'll need to add these:
```bash
npm install @solana/web3.js @solana/spl-token
npm install tweetnacl bs58
npm install axios dotenv
npm install swr zustand  # State management (optional)
```

---

## 🗄️ Database Setup

### Option 1: MongoDB (Recommended)

```bash
# Using MongoDB Atlas
# 1. Create account: https://www.mongodb.com/cloud/atlas
# 2. Create database cluster
# 3. Get connection string
# 4. Add to .env.local:

DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/x402gpt
```

### Option 2: PostgreSQL

```bash
# Install PostgreSQL locally or use cloud service
# 1. Create database: x402gpt
# 2. Get connection string
# 3. Add to .env.local:

DATABASE_URL=postgresql://user:password@localhost:5432/x402gpt

# Run migrations (if using Prisma)
npx prisma migrate deploy
```

### Option 3: SQLite (Development Only)

```bash
# For local testing without external database
DATABASE_URL=file:./dev.db
```

---

## 🧪 Testing Installation

### 1. Verify Node Version

```bash
node --version  # Should be v18.17.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### 2. Check Dependencies

```bash
npm list
```

### 3. Build Check

```bash
npm run build
```

If successful, you'll see: `✓ Compiled successfully`

### 4. Test API Endpoints

```bash
# In a new terminal while dev server is running
curl http://localhost:3000/api/models
```

Expected response:
```json
{
  "success": true,
  "models": [...]
}
```

---

## 🔐 Wallet Setup

### 1. Install Phantom Extension

- Chrome: https://chrome.google.com/webstore
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/phantom-app/

### 2. Create Wallet

- Open Phantom extension
- Click "Create New Wallet"
- Save recovery phrase securely
- Set password

### 3. Switch to Devnet (for testing)

- Click Settings (gear icon)
- Select "Change Network"
- Choose "Devnet"

### 4. Get Test SOL

- Devnet Faucet: https://solfaucet.com
- Paste wallet address
- Claim test SOL (2 SOL per request)

### 5. Get Test USDC

Option A: Create wrapped token manually
Option B: Use devnet USDC faucet

---

## 🚀 Project Structure Setup

The project automatically creates this structure:

```
x402-task1/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Utilities & business logic
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
├── config/                 # Configuration files
├── public/                 # Static files
├── docs/                   # Documentation
├── .env.local              # Local environment (create)
├── .env.example            # Environment template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind config
└── next.config.ts          # Next.js config
```

---

## 🔄 Development Workflow

### Start Development Server

```bash
npm run dev
```

Opens http://localhost:3000 with:
- Hot reload on file changes
- Error overlay on compilation errors
- API route debugging

### Run Linting

```bash
npm run lint
```

### Build for Production

```bash
npm run build
npm start
```

### Debug Mode

```bash
DEBUG=true npm run dev
```

---

## ⚠️ Common Setup Issues

### Issue: "Cannot find module '@solana/web3.js'"

**Solution:**
```bash
npm install @solana/web3.js @solana/spl-token
```

### Issue: "API key not found"

**Solution:**
1. Verify `.env.local` exists (not `.env`)
2. Check for typos in environment variable names
3. Restart dev server after changing `.env.local`

### Issue: "Phantom wallet not detected"

**Solution:**
1. Install Phantom extension
2. Make sure extension is enabled
3. Check browser console for errors
4. Try incognito window if issues persist

### Issue: "CORS error when calling APIs"

**Solution:**
1. Ensure API calls go through `/api/` routes
2. Check `NEXT_PUBLIC_ALLOWED_ORIGINS` in `.env.local`
3. Don't call external APIs directly from frontend

---

## 🧹 Cleanup & Reset

### Clear Node Modules
```bash
rm -rf node_modules package-lock.json
npm install
```

### Reset Next.js Cache
```bash
rm -rf .next
npm run build
```

### Reset Environment
```bash
rm .env.local
cp .env.example .env.local
# Reconfigure with new values
```

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with all required variables
- [ ] API keys configured (OpenAI, Gemini, Claude)
- [ ] Phantom wallet installed and set to devnet
- [ ] Test SOL and USDC in wallet
- [ ] Development server starts (`npm run dev`)
- [ ] http://localhost:3000 loads without errors
- [ ] Wallet connection button visible and functional
- [ ] Can view available models at `/api/models`

---

**Last Updated**: 2025-11-03