// src/app/chat/page.tsx
import { Metadata } from 'next';
import ChatInterface from '@/app/chat/components/ChatInterface';

export const metadata: Metadata = {
    title: 'X402 Chat - Pay-per-request AI Assistant',
    description: 'Interact with AI using X402 protocol payments. Get responses from OpenAI, Gemini, and Claude with instant crypto payments.',
    keywords: 'X402, crypto payments, AI chat, Solana payments, pay per request',
}

// Main chat page without specific ID - will create timestamped URL on first message
export default function ChatPage() {
    return (
        <div className="flex-1 h-full overflow-hidden bg-black">
            <ChatInterface />
        </div>
    );
}