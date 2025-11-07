// src/app/chat/page.tsx - Updated chat page with X402 payment integration
'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useX402Payment, usePaymentRequired } from '@/hooks/useX402Payment';
import { WalletButton } from '@/components/WalletConnect/WalletButton';
import { MessageSquare, Image as ImageIcon, Sparkles, Send, AlertCircle, Loader2 } from 'lucide-react';
import type { ModelConfig } from '@/types/models';
import type { Message } from '@/types/chat';

export default function ChatPage() {
    const { address, connected, balance } = useWallet();
    const { isPaying, paymentError, processPayment, clearError } = useX402Payment();
    const { checkPaymentRequired } = usePaymentRequired();

    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<any>(null);
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
            if (!res.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await res.json();
            if (data.success) {
                setModels(data.models);
            } else {
                console.error('Models API error:', data.error);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
            // Show error in UI
            addMessage('error', 'Failed to load available models. Please refresh the page.');
        }
    }

    const addMessage = (role: 'user' | 'assistant' | 'error', content: string, cost: number = 0.01) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            conversationId: 'default',
            role: role === 'error' ? 'assistant' : role,
            content,
            model: selectedModel,
            cost,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async () => {
        if (!input.trim() || !connected || loading || isPaying) return;

        const userMessage = input;
        setInput('');
        addMessage('user', userMessage);
        setLoading(true);
        clearError();

        try {
            console.log('🚀 Starting chat request for:', userMessage.substring(0, 50));

            // Step 1: Always check if payment is required first
            const paymentData = await checkPaymentRequired('/api/chat', {
                model: selectedModel,
                message: userMessage
            });

            if (paymentData) {
                console.log('💳 Payment required, processing payment...');
                setPendingPayment(paymentData);

                // Process payment
                const result = await processPayment(paymentData, userMessage, selectedModel);
                setPendingPayment(null);

                if (result && result.success) {
                    addMessage('assistant', result.response, result.cost?.amount || paymentData.amount);
                    console.log('✅ Payment successful, response received');
                } else {
                    addMessage('error', paymentError || 'Payment failed');
                }
            } else {
                // No payment required (shouldn't happen with our setup)
                console.log('ℹ️ No payment required');
                addMessage('error', 'No payment required - this should not happen');
            }

        } catch (err) {
            console.error('❌ Chat request error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Request failed';
            addMessage('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const selectedModelConfig = models.find(m => m.id === selectedModel);
    const estimatedCost = selectedModelConfig?.pricing.baseRequest || 0.01;

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-bold">Solana X402 GPT</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Balance Display */}
                    {connected && balance && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/30">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm">{balance.usdc.toFixed(3)} USDC</span>
                        </div>
                    )}

                    <WalletButton />
                </div>
            </header>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/50 text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                        Chat
                        <span className="text-xs">${estimatedCost}</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600" disabled>
                        <ImageIcon className="w-4 h-4" />
                        Image
                        <span className="text-xs">$0.10</span>
                    </button>
                </div>

                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    disabled={loading || isPaying}
                >
                    {models.length > 0 ? (
                        models.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))
                    ) : (
                        <option value="">Loading models...</option>
                    )}
                </select>
            </div>

            {/* Payment Status */}
            {(isPaying || pendingPayment) && (
                <div className="px-6 py-2 bg-yellow-900/20 border-b border-yellow-500/30">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                            {isPaying ? 'Processing payment...' : 'Payment required - Please confirm in your wallet'}
                        </span>
                        {pendingPayment && (
                            <span className="text-xs">
                                (${pendingPayment.amount} USDC)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Error */}
            {paymentError && (
                <div className="px-6 py-2 bg-red-900/20 border-b border-red-500/30">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{paymentError}</span>
                        <button
                            onClick={clearError}
                            className="ml-auto text-red-400 hover:text-red-300"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                            <p className="text-lg mb-2">Welcome to Solana X402 GPT</p>
                            <p className="text-sm mb-4">Pay-per-request AI powered by Solana blockchain</p>
                            {!connected && (
                                <p className="text-xs text-yellow-400">Connect your Phantom wallet to get started</p>
                            )}
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
                            <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <span className="capitalize">
                                    {msg.role === 'user' ? 'You' : 'Assistant'}
                                </span>
                                {msg.cost > 0 && (
                                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                                        ${msg.cost.toFixed(3)}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-300 break-words whitespace-pre-wrap">
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-800">
                {!connected && (
                    <div className="mb-3 px-4 py-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Please connect your Phantom wallet to start chatting
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={connected ? "Type your message..." : "Connect wallet first..."}
                        disabled={!connected || loading || isPaying}
                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!connected || loading || isPaying || !input.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg font-medium hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading || isPaying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Send
                    </button>
                </div>

                {selectedModelConfig && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                        <span>Using {selectedModelConfig.name} • ${selectedModelConfig.pricing.baseRequest} per request</span>
                        {connected && balance && (
                            <span className="text-emerald-400">
                                Balance: {balance.usdc.toFixed(3)} USDC
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}