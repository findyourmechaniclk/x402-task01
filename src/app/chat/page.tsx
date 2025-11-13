// src/app/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useX402Payment, usePaymentRequired } from '@/hooks/useX402Payment';
import { WalletButton } from '@/components/WalletConnect/WalletButton';
import { MessageSquare, Image as ImageIcon, Sparkles, Send, AlertCircle, Loader2, Menu, X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ModelConfig } from '@/types/models';
import type { Message, Conversation } from '@/types/chat';
import type { X402PaymentData } from '@/types/x402';
import { usePaymentEstimation } from '@/hooks/usePaymentEstimation';
import {
    createNewConversation,
    saveConversation,
    getConversationsByWallet,
    addMessage,
    getCurrentConversationId,
    setCurrentConversationId,
    generateMessageId,
    clearAllConversations
} from '@/lib/storage/localStorage';

export default function ChatPage() {
    const { connected, balance, address } = useWallet();
    const { isPaying, paymentError, processPayment, clearError } = useX402Payment();
    const { checkPaymentRequired } = usePaymentRequired();
    const { estimatePayment } = usePaymentEstimation();

    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<X402PaymentData | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversations when wallet connects
    useEffect(() => {
        if (connected && address) {
            loadConversations();
        } else {
            setConversations([]);
            setCurrentConversation(null);
        }
    }, [connected, address]);

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentConversation?.messages]);

    const loadConversations = () => {
        if (!address) return;

        try {
            const userConversations = getConversationsByWallet(address);
            setConversations(userConversations);

            // Load current conversation or create new one
            const currentId = getCurrentConversationId();
            let current = userConversations.find(c => c.id === currentId);

            if (!current && userConversations.length > 0) {
                current = userConversations[0];
            }

            if (!current) {
                // Create new conversation
                current = createNewConversation(address, selectedModel, 'New Chat');
                saveConversation(current);
                setCurrentConversationId(current.id);
            }

            setCurrentConversation(current);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const createNewChat = () => {
        if (!address) return;

        const newConv = createNewConversation(address, selectedModel, 'New Chat');
        saveConversation(newConv);
        setCurrentConversationId(newConv.id);
        setCurrentConversation(newConv);
        loadConversations();
        setSidebarOpen(false);
    };

    const switchConversation = (convId: string) => {
        const conv = conversations.find(c => c.id === convId);
        if (conv) {
            setCurrentConversation(conv);
            setCurrentConversationId(convId);
            setSidebarOpen(false);
        }
    };

    const clearAllChats = () => {
        if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
            clearAllConversations();
            setConversations([]);
            setCurrentConversation(null);
            if (address) {
                createNewChat();
            }
        }
    };

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
        }
    }

    const handleSend = async () => {
        if (!input.trim() || !connected || loading || isPaying || !address) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);
        clearError();

        // Create or get current conversation
        let conversation = currentConversation;
        if (!conversation) {
            conversation = createNewConversation(address, selectedModel, 'New Chat');
            saveConversation(conversation);
            setCurrentConversationId(conversation.id);
            setCurrentConversation(conversation);
        }

        // Add user message
        const userMsg: Message = {
            id: generateMessageId(),
            conversationId: conversation.id,
            role: 'user',
            content: userMessage,
            model: selectedModel,
            cost: 0,
            timestamp: new Date(),
        };

        try {
            const success = addMessage(conversation.id, userMsg);
            if (success) {
                const updatedConv = {
                    ...conversation,
                    messages: [...conversation.messages, userMsg],
                    updatedAt: new Date()
                };
                setCurrentConversation(updatedConv);
            }

            console.log('🚀 Starting chat request for:', userMessage.substring(0, 50));

            // Always check if payment is required first
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
                    const assistantMsg: Message = {
                        id: generateMessageId(),
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: result.response,
                        model: selectedModel,
                        cost: result.cost?.amount || paymentData.amount,
                        timestamp: new Date(),
                    };

                    const msgSuccess = addMessage(conversation.id, assistantMsg);
                    if (msgSuccess) {
                        const finalConv = {
                            ...conversation,
                            messages: [...conversation.messages, userMsg, assistantMsg],
                            updatedAt: new Date(),
                            totalCost: conversation.totalCost + assistantMsg.cost,
                            messageCount: conversation.messageCount + 2
                        };
                        setCurrentConversation(finalConv);
                        loadConversations();
                    }
                } else {
                    const errorMsg: Message = {
                        id: generateMessageId(),
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: `❌ **Error:** ${paymentError || 'Payment failed'}`,
                        model: selectedModel,
                        cost: 0,
                        timestamp: new Date(),
                    };

                    addMessage(conversation.id, errorMsg);
                    const errorConv = {
                        ...conversation,
                        messages: [...conversation.messages, userMsg, errorMsg],
                        updatedAt: new Date()
                    };
                    setCurrentConversation(errorConv);
                }
            }

        } catch (err) {
            console.error('❌ Chat request error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Request failed';

            const errorMsg: Message = {
                id: generateMessageId(),
                conversationId: conversation.id,
                role: 'assistant',
                content: `❌ **Error:** ${errorMessage}`,
                model: selectedModel,
                cost: 0,
                timestamp: new Date(),
            };

            if (conversation) {
                addMessage(conversation.id, errorMsg);
                const errorConv = {
                    ...conversation,
                    messages: [...conversation.messages, userMsg, errorMsg],
                    updatedAt: new Date()
                };
                setCurrentConversation(errorConv);
            }
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic cost estimation based on current input
    const selectedModelConfig = models.find(m => m.id === selectedModel);
    const estimatedCost = selectedModelConfig && input.length > 0
        ? estimatePayment(selectedModel, input.length).amount
        : selectedModelConfig?.pricing.baseRequest || 0.01;

    return (
        <div className="flex flex-col h-screen bg-black text-white relative overflow-hidden">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/25 z-40"
                        onClick={() => setSidebarOpen(false)}
                    />

                    {/* Sidebar */}
                    <div className="fixed top-0 left-0 h-full w-80 bg-gray-900/50 border-r border-gray-800 backdrop-blur-lg z-50 flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Sparkles className="w-5 h-5" />
                                    <span className="font-bold text-sm">Chat History</span>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {connected && (
                                <button
                                    onClick={createNewChat}
                                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    New Chat
                                </button>
                            )}
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {connected ? (
                                conversations.length > 0 ? (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            onClick={() => switchConversation(conv.id)}
                                            className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${currentConversation?.id === conv.id
                                                ? 'bg-emerald-900/50 border border-emerald-500/50'
                                                : 'bg-gray-800 hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="font-medium text-sm truncate">{conv.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {conv.messageCount} messages • ${conv.totalCost.toFixed(4)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {conv.updatedAt.toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 mt-8">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">No conversations yet</p>
                                    </div>
                                )
                            ) : (
                                <div className="text-center text-gray-500 mt-8">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">Connect wallet to view chats</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        {connected && conversations.length > 0 && (
                            <div className="p-4 border-t border-gray-800">
                                <button
                                    onClick={clearAllChats}
                                    className="w-full px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-colors flex items-center gap-2 justify-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Chats
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Header - Fixed at top */}
            <header className="fixed top-0 left-0 right-0 z-35 border-b border-gray-800 bg-black/80 backdrop-blur-xl">
                <div className="mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggle Button */}
                        {connected && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <h1 className="text-xl font-bold">
                                Solana <span className="text-cyan-400">X402</span> GPT
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Balance Display */}
                        {/* {connected && balance && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/30">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm">{balance.usdc.toFixed(4)} USDC</span>
                        </div>
                    )} */}
                        <WalletButton />
                    </div>
                </div>
            </header>

            {/* Main content - with proper spacing for fixed elements */}
            <main className="flex-1 flex flex-col mt-19 overflow-y-auto">
                {/* Action Bar - Fixed with backdrop blur */}
                <div className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-gray-800 pt-2">
                    <div className="flex items-center justify-between px-10 py-3">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 rounded-lg border border-emerald-500/50 text-emerald-400">
                                <MessageSquare className="w-4 h-4" />
                                Chat
                                <span className="text-xs">${estimatedCost.toFixed(4)}</span>
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
                                        {model.name} (${model.pricing.baseRequest})
                                    </option>
                                ))
                            ) : (
                                <option value="">Loading models...</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Payment Status - Fixed with backdrop blur */}
                {(isPaying || pendingPayment) && (
                    <div className="sticky top-19 z-30 bg-black/80 backdrop-blur-xl border-b border-yellow-500/30">
                        <div className="px-10 py-3 bg-yellow-900/20">
                            <div className="flex items-center gap-2 text-yellow-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">
                                    {isPaying ? 'Processing payment...' : 'Payment required - Please confirm in your wallet'}
                                </span>
                                {pendingPayment && (
                                    <span className="text-xs">
                                        (${pendingPayment.amount.toFixed(4)} USDC)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Error - Fixed with backdrop blur */}
                {paymentError && (
                    <div className="sticky top-19 z-30 bg-black/80 backdrop-blur-xl border-b border-red-500/30">
                        <div className="px-10 py-3 bg-red-900/20">
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">{paymentError}</span>
                                <button
                                    onClick={clearError}
                                    className="ml-auto text-red-400 hover:text-red-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages - Scrollable area */}
                <div className="flex-1 px-10 py-6 bg-gray-900/40 backdrop-blur-md relative z-10">
                    <div className="space-y-4">
                        {!connected ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                                    <p className="text-lg mb-2">Welcome to Solana X402 GPT</p>
                                    <p className="text-sm mb-4">Pay-per-request AI powered by Solana blockchain</p>
                                    <p className="text-xs text-yellow-400">Connect your Phantom wallet to get started</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {(!currentConversation || currentConversation.messages.length === 0) && (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <div className="text-center">
                                            <Sparkles className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                                            <p className="text-lg mb-2">Start a conversation</p>
                                            <p className="text-sm mb-4">Use AI Pro with instant crypto payments on Solana</p>
                                        </div>
                                    </div>
                                )}

                                {currentConversation?.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                            {/* Message bubble */}
                                            <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                                                : 'bg-white/5 border border-white/10 text-gray-300'
                                                }`}>
                                                <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <p className="mb-2 last:mb-0 ">{children}</p>,
                                                            code: ({ children, className }) =>
                                                                className ? (
                                                                    <code className="bg-black/20 px-2 py-1 rounded text-sm font-mono">{children}</code>
                                                                ) : (
                                                                    <code className="bg-black/20 px-1 rounded font-mono">{children}</code>
                                                                ),
                                                            pre: ({ children }) => (
                                                                <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto text-sm font-mono border border-gray-600">{children}</pre>
                                                            ),
                                                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                                            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-600 pl-4 italic">{children}</blockquote>,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>

                                            {/* Message metadata */}
                                            <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                                }`}>
                                                <span>{msg.timestamp.toLocaleTimeString()}</span>
                                                {msg.cost > 0 && (
                                                    <span className="bg-gray-800 px-2 py-0.5 rounded">
                                                        ${msg.cost.toFixed(4)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">AI is thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                {/* Input - Fixed at bottom with backdrop blur */}
                <div className="sticky bottom-0 z-20 bg-black/75 backdrop-blur-lg border-t border-gray-800">
                    <div className="px-10 py-4">
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

                        {selectedModelConfig && connected && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                                <span>Using {selectedModelConfig.name} • Base: ${selectedModelConfig.pricing.baseRequest} • Est: ${estimatedCost.toFixed(4)}</span>
                                {balance && (
                                    <span className="text-emerald-400">
                                        Balance: {balance.usdc.toFixed(4)} USDC
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}