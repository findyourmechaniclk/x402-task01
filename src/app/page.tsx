// src/app/page.tsx
import Link from 'next/link';
import { WalletButton } from '@/components/WalletConnect/WalletButton';

export default function Home() {
  return (
    // Main container with dark theme styling
    <div className="min-h-screen bg-black text-white">
      {/* ===== HEADER SECTION ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/60 backdrop-blur-xl">
        {/* Navigation container with responsive layout */}
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h1 className="text-xl font-bold">
              Solana <span className="text-cyan-400">X402</span> GPT
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#models" className="text-gray-400 hover:text-white transition-colors">
              Models
            </Link>
            <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <WalletButton />
            <Link
              href="/chat"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT SECTION ===== */}
      <main className="pt-32 pb-20 px-6">
        {/* Main content container with max width constraint */}
        <div className="container mx-auto max-w-6xl">
          {/* ===== HERO SECTION ===== */}
          <div className="text-center mb-20">
            <div className="inline-block mb-4 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full text-cyan-400 text-sm font-medium">
              Powered by X402 Protocol on Solana
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Platform AI powered
              <br />
              by <span className="text-cyan-400">X402 Protocol</span> on
              <br />
              Solana
            </h1>

            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Use AI Pro with instant crypto payments on Solana.
              Pay per request with USDC. No subscriptions, no commitments.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/chat"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Start Chatting
              </Link>
              <a
                href="#models"
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold transition-all"
              >
                View Models
              </a>
            </div>
          </div>

          {/* ===== FEATURES SECTION ===== */}
          <section id="features" className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">
              Experience AI Pro with instant crypto payments
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Lightning-fast transactions</h3>
                <p className="text-gray-400">
                  Instant payments via X402 protocol. Start chatting immediately after payment confirmation.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure & transparent</h3>
                <p className="text-gray-400">
                  All transactions verified on Solana blockchain. Your payments are secure and verifiable.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No monthly fees</h3>
                <p className="text-gray-400">
                  Pay only for what you use. No subscriptions, no hidden fees. Complete transparency.
                </p>
              </div>
            </div>
          </section>

          {/* ===== AI MODELS SECTION ===== */}
          <section id="models" className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4">
              This platform supports multiple AI models
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Choose the best AI model for your needs, all accessible with instant payments
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium">
                GPT-4o
              </div>
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium">
                GPT-4 Turbo
              </div>
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium">
                Gemini 2.0
              </div>
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium">
                Claude 3.5
              </div>
            </div>
          </section>

          {/* ===== PRICING SECTION ===== */}
          <section id="pricing" className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-4">
              Simple, <span className="text-cyan-400">pay-per-use</span> pricing
            </h2>
            <p className="text-gray-400 text-center mb-12">
              No subscriptions. Pay only for the AI responses you need.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border border-purple-600/20 rounded-xl">
                <h3 className="text-2xl font-bold mb-2">AI Conversation</h3>
                <div className="text-4xl font-bold text-cyan-400 mb-4">0.01 USDC</div>
                <p className="text-gray-400 mb-6">per message</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    GPT-4o, GPT-4 Turbo access
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gemini 2.0, Claude 3.5
                  </li>
                </ul>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-2xl font-bold mb-2">AI Generation</h3>
                <div className="text-4xl font-bold text-purple-400 mb-4">0.10 USDC</div>
                <p className="text-gray-400 mb-6">per image</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    DALL-E 3 access
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ===== FOOTER SECTION ===== */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Solana X402 GPT. Powered by X402 Protocol on Solana.</p>
        </div>
      </footer>
    </div>
  );
}