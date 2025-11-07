'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletButton } from '@/components/WalletConnect/WalletButton';
import { MessageSquare, Image as ImageIcon, Sparkles, Send } from 'lucide-react';
import type { ModelConfig } from '@/types/models';
import type { Message } from '@/types/chat';

export default function ChatPage() {
    const { address, connected, balance } = useWallet();
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function fetchModels() {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            if (data.success) {
                setModels(data.models);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
        }
    }

    const addMessage = (role: 'user' | 'assistant' | 'error', content: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            conversationId: 'default',
            role: role === 'error' ? 'assistant' : role,
            content,
            model: selectedModel,
            cost: 0.01,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async () => {
        if (!input.trim() || !connected || loading) return;

        const userMessage = input;
        setInput('');
        addMessage('user', userMessage);
        setLoading(true);

        try {
            // X402 middleware handles payment automatically
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    message: userMessage,
                }),
            });

            const data = await response.json();

            if (data.success) {
                addMessage('assistant', data.response);
            } else {
                addMessage('error', data.error?.message || 'Request failed');
            }
        } catch (err) {
            addMessage('error', err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const selectedModelConfig = models.find(m => m.id === selectedModel);

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <span className="text-xl">⚡</span>
                        <span className="font-bold">Solana</span>
                    </div>
                    <span className="text-emerald-400 font-bold">X402 GPT</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Balance Display */}
                    {connected && balance && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/30">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm">Total: {balance.usdc.toFixed(3)} USDC</span>
                        </div>
                    )}

                    {/* Your Existing WalletButton Component */}
                    <WalletButton />
                </div>
            </header>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/50 text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                        Chat
                        <span className="text-xs">0.01 USDC</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600">
                        <ImageIcon className="w-4 h-4" />
                        Image
                        <span className="text-xs">0.1 USDC</span>
                    </button>
                </div>

                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                    {models.map(model => (
                        <option key={model.id} value={model.id}>
                            🔥 {model.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <p className="text-lg mb-2">Start a conversation</p>
                            <p className="text-sm">Connect your wallet and send a message</p>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-emerald-600'
                            }`}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium mb-1 capitalize">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                            <div className="text-sm text-gray-300 break-words">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                        <span className="text-sm">Processing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-800">
                {!connected && (
                    <div className="mb-3 px-4 py-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                        Please connect your Phantom wallet to start chatting
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={connected ? "Type your message..." : "Connect wallet first..."}
                        disabled={!connected || loading}
                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!connected || loading || !input.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg font-medium hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Send
                    </button>
                </div>

                {selectedModelConfig && (
                    <div className="mt-2 text-xs text-gray-500">
                        Using {selectedModelConfig.name} • {selectedModelConfig.pricing.baseRequest} USDC per request
                    </div>
                )}
            </div>
        </div>
    );
}