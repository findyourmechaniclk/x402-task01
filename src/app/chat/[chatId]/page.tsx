// src/app/chat/[chatId]/page.tsx
import { Metadata } from 'next';
import ChatInterface from '@/app/chat/components/ChatInterface';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'X402 Chat Session',
    description: 'Continue your AI conversation with X402 pay-per-request protocol',
    keywords: 'X402, AI chat session, crypto payments, Solana',
}

interface PageProps {
    params: Promise<{ chatId: string }>;
}

export default async function ChatDetailPage({ params }: PageProps) {
    const { chatId } = await params;

    // Validate chatId format (should be 13-digit timestamp)
    if (!/^\d{13}$/.test(chatId)) {
        notFound();
    }

    return (
        <div className="flex-1 h-full overflow-hidden bg-black">
            <ChatInterface chatId={chatId} />
        </div>
    );
}