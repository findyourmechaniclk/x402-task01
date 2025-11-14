// src/app/chat/components/ChatInterface.tsx
"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useWallet } from '@/contexts/WalletContext';
import { useX402Payment, usePaymentRequired } from '@/hooks/useX402Payment';
import { WalletButton } from '@/components/WalletConnect/WalletButton';
import { MessageSquare, Image as ImageIcon, Sparkles, Send, AlertCircle, Loader2, Menu, X, Trash2 } from 'lucide-react';
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
    clearAllConversations,
    getConversation,
    getMessages
} from '@/lib/storage/localStorage';

interface ChatInterfaceProps {
    chatId?: string; // Optional - if not provided, we're on the main /chat route
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
    const { connected, balance, address } = useWallet();
    const { isPaying, paymentError, processPayment, clearError } = useX402Payment();
    const { checkPaymentRequired } = usePaymentRequired();
    const { estimatePayment } = usePaymentEstimation();
    const router = useRouter();

    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [mode, setMode] = useState<'chat' | 'image'>('chat');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<X402PaymentData | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNewChat, setIsNewChat] = useState(!chatId);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasCheckedPendingPrompt = useRef(false);
    const shouldAutoSubmit = useRef(false);

    // Load conversations when wallet connects
    useEffect(() => {
        if (connected && address) {
            loadConversations();
        } else {
            setConversations([]);
            setCurrentConversation(null);
        }
    }, [connected, address]);

    // Load specific conversation if chatId is provided
    useEffect(() => {
        if (chatId && address) {
            loadSpecificConversation();
        } else if (!chatId) {
            setIsNewChat(true);
            setCurrentConversation(null);
        }
    }, [chatId, address]);

    // Check for pending prompt from navigation OR pending message
    useEffect(() => {
        if (!hasCheckedPendingPrompt.current && chatId && connected && address) {
            const pendingMessage = sessionStorage.getItem('pendingMessage');
            const pendingModel = sessionStorage.getItem('pendingModel');

            if (pendingMessage && currentConversation) {
                console.log('Found pending message for chat:', chatId, pendingMessage);
                hasCheckedPendingPrompt.current = true;

                sessionStorage.removeItem('pendingMessage');
                if (pendingModel) {
                    setSelectedModel(pendingModel);
                    sessionStorage.removeItem('pendingModel');
                }

                // Process the pending message after a small delay to ensure everything is loaded
                setTimeout(() => {
                    processTextMessage(pendingMessage, currentConversation);
                }, 100);
            }
        }

        // Also handle pending prompts from homepage
        if (!hasCheckedPendingPrompt.current) {
            const pendingPrompt = sessionStorage.getItem('pendingPrompt');

            if (pendingPrompt) {
                console.log('Found pending prompt:', pendingPrompt);
                hasCheckedPendingPrompt.current = true;
                sessionStorage.removeItem('pendingPrompt');
                sessionStorage.removeItem('selectedModel');
                shouldAutoSubmit.current = true;
                setInput(pendingPrompt);
            }
        }
    }, [chatId, currentConversation, connected, address]);

    // Auto-submit pending prompt (but not pending messages)
    useEffect(() => {
        if (shouldAutoSubmit.current && input.trim() && connected && !sessionStorage.getItem('pendingMessage')) {
            shouldAutoSubmit.current = false;
            setTimeout(handleSend, 500);
        }
    }, [input, connected]);

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentConversation?.messages]);

    // Load specific conversation if chatId is provided
    useEffect(() => {
        if (chatId && address) {
            loadSpecificConversation();
        } else if (!chatId) {
            setIsNewChat(true);
            setCurrentConversation(null);
        }
    }, [chatId, address]);

    const filteredModels = useMemo(
        () =>
            models.filter(m =>
                mode === 'chat'
                    ? m.capabilities.includes('text')
                    : m.capabilities.includes('image')
            ),
        [models, mode]
    );

    // If you switch modes and the current selectedModel isn't valid anymore,
    // snap it to the first valid model (same UX pattern as you already use via defaults).
    useEffect(() => {
        if (!filteredModels.length) return;
        if (!filteredModels.find(m => m.id === selectedModel)) {
            setSelectedModel(filteredModels[0].id);
        }
    }, [filteredModels, selectedModel, setSelectedModel]);


    const loadSpecificConversation = () => {
        if (!chatId || !address) return;

        const conversation = getConversation(chatId);
        if (!conversation || conversation.walletAddress !== address) {
            // Conversation not found or doesn't belong to current wallet
            router.replace('/chat');
            return;
        }

        // Load messages separately
        const messages = getMessages(chatId);
        const fullConversation = {
            ...conversation,
            messages
        };

        setCurrentConversation(fullConversation);
        setIsNewChat(false);
        setCurrentConversationId(chatId);
    };

    const loadConversations = () => {
        if (!address) return;

        try {
            const userConversations = getConversationsByWallet(address);
            setConversations(userConversations);

            // If we have a chatId, load that specific conversation
            if (chatId) {
                const current = userConversations.find(c => c.id === chatId);
                if (current) {
                    setCurrentConversation(current);
                    setCurrentConversationId(chatId);
                    setIsNewChat(false);
                }
            } else if (!isNewChat) {
                // Load current conversation or use the first one
                const currentId = getCurrentConversationId();
                let current = userConversations.find(c => c.id === currentId);

                if (!current && userConversations.length > 0) {
                    current = userConversations[0];
                }

                if (current) {
                    setCurrentConversation(current);
                    setCurrentConversationId(current.id);
                }
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const createNewChatFromMessage = (firstMessage: string): Conversation => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        // Generate timestamp-based ID
        const timestampId = Date.now().toString();

        // Create conversation with first message as title (truncated)
        const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

        const newConv: Conversation = {
            id: timestampId,
            walletAddress: address,
            title,
            model: selectedModel,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
            totalCost: 0,
            messageCount: 0,
        };

        saveConversation(newConv);
        setCurrentConversationId(timestampId);
        setCurrentConversation(newConv);
        setIsNewChat(false);

        // Navigate to the timestamped URL immediately
        router.push(`/chat/${timestampId}`);

        console.log('Created new conversation with timestamp ID:', timestampId);
        return newConv;
    };

    const createNewChat = () => {
        if (!address) return;

        // Navigate to new chat route
        router.push('/chat');
        setSidebarOpen(false);
    };

    const switchConversation = (convId: string) => {
        router.push(`/chat/${convId}`);
        setSidebarOpen(false);
    };

    const clearAllChats = () => {
        if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
            clearAllConversations();
            setConversations([]);
            setCurrentConversation(null);
            router.push('/chat');
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
        clearError();

        try {
            // Create conversation first if this is a new chat
            let conversation = currentConversation;
            if (isNewChat || !conversation) {
                conversation = createNewChatFromMessage(userMessage);
                // Store the message in sessionStorage to process after navigation
                sessionStorage.setItem('pendingMessage', userMessage);
                sessionStorage.setItem('pendingModel', selectedModel);
                sessionStorage.setItem('pendingMode', mode);
                return; // Exit early, let the navigation handle the rest
            }

            // Process message for existing conversation
            if (mode === 'chat') {
                await processTextMessage(userMessage, conversation);
            } else {
                await processImageMessage(userMessage, conversation);
            }
        } catch (err) {
            console.error('❌ Chat request error:', err);
            setLoading(false);
        }
    };

    const processTextMessage = async (userMessage: string, conversation: Conversation) => {
        setLoading(true);

        // Add user message
        const userMsg: Message = {
            id: generateMessageId(),
            conversationId: conversation.id,
            role: 'user',
            type: 'text',
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

            // Check if payment is required
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
                        type: 'text',
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

    const processImageMessage = async (prompt: string, conversation: Conversation) => {
        setLoading(true);

        // Add user message to conversation (same pattern as text)
        const userMsg: Message = {
            id: generateMessageId(),
            conversationId: conversation.id,
            role: 'user',
            type: 'text',
            content: prompt,
            model: selectedModel,
            cost: 0,
            timestamp: new Date(),
        };

        const msgSuccess = addMessage(conversation.id, userMsg);
        if (!msgSuccess) {
            setLoading(false);
            return;
        }

        const baseConv = {
            ...conversation,
            messages: [...conversation.messages, userMsg],
            updatedAt: new Date(),
            messageCount: conversation.messageCount + 1,
        };
        setCurrentConversation(baseConv);

        try {
            // (Optional) use X402 for images too, same pattern as /api/chat
            // const paymentData = await checkPaymentRequired('/api/image', {
            //   model: selectedModel,
            //   prompt,
            // });
            // ...processPayment like you do for chat...

            const res = await fetch('/api/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Image generation failed');
            }

            const imageUrl: string = data.image;

            const assistantMsg: Message = {
                id: generateMessageId(),
                conversationId: conversation.id,
                role: 'assistant',
                type: 'image',
                imageUrl: imageUrl,
                // markdown image – works with your ReactMarkdown renderer
                content: `Generated Image`,
                model: data.model || selectedModel,
                cost: data.cost?.amount ?? baseConv.totalCost ?? 0,
                timestamp: new Date(),
            };

            addMessage(conversation.id, assistantMsg);

            const finalConv: Conversation = {
                ...baseConv,
                messages: [...baseConv.messages, assistantMsg],
                updatedAt: new Date(),
                totalCost: (baseConv.totalCost || 0) + (assistantMsg.cost || 0),
                messageCount: baseConv.messageCount + 1,
            };

            setCurrentConversation(finalConv);
            loadConversations();
        } catch (err) {
            console.error('Image request error:', err);
            const errorMsg: Message = {
                id: generateMessageId(),
                conversationId: conversation.id,
                role: 'assistant',
                content: `❌ **Image error:** ${err instanceof Error ? err.message : 'Image request failed'
                    }`,
                model: selectedModel,
                cost: 0,
                timestamp: new Date(),
            };
            addMessage(conversation.id, errorMsg);

            setCurrentConversation({
                ...baseConv,
                messages: [...baseConv.messages, errorMsg],
                updatedAt: new Date(),
                messageCount: baseConv.messageCount + 1,
            });
        } finally {
            setLoading(false);
        }
    };


    const renderMessageBubble = (msg: Message) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Message bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                        : 'bg-white/5 border border-white/10 text-gray-300'
                        }`}
                >
                    <div className="prose prose-invert prose-sm max-w-none break-words whitespace-normal">
                        {msg.type === 'image' && msg.imageUrl ? (
                            <div className="mt-2">
                                <img
                                    src={msg.imageUrl}
                                    alt={msg.content || 'Generated image'}
                                    className="max-w-xl w-full rounded-lg border border-gray-700"
                                />
                            </div>
                        ) : (
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    code: ({ children, className }) =>
                                        className ? (
                                            <code className="bg-black/20 px-2 py-1 rounded text-sm font-mono">
                                                {children}
                                            </code>
                                        ) : (
                                            <code className="bg-black/20 px-1 rounded font-mono">{children}</code>
                                        ),
                                    pre: ({ children }) => (
                                        <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto text-sm font-mono border border-gray-600">
                                            {children}
                                        </pre>
                                    ),
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-gray-600 pl-4 italic">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>

                {/* Message metadata */}
                <div
                    className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                >
                    <span>{msg.timestamp.toLocaleTimeString()}</span>
                    {msg.cost > 0 && (
                        <span className="bg-gray-800 px-2 py-0.5 rounded">
                            ${msg.cost.toFixed(4)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );


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
                            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border  
                            ${mode === 'chat' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'border-slate-700/50 text-gray-400 hover:border-gray-600 bg-emerald-900/10'}`}
                                onClick={() => setMode('chat')} type='button'
                            >
                                <MessageSquare className="w-4 h-4" />
                                Chat
                                <span className="text-xs">${estimatedCost.toFixed(4)}</span>
                            </button>
                            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border  
                            ${mode === 'image' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'border-slate-700/50 text-gray-400 hover:border-gray-600 bg-emerald-900/10'}`}
                                onClick={() => setMode('image')} type='button'
                            >
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
                            {filteredModels.length > 0 ? (
                                filteredModels.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name} (${model.pricing.baseRequest})
                                    </option>
                                ))
                            ) : (
                                <option value="">
                                    {mode === 'chat' ? 'No chat models available' : 'No image models available'}
                                </option>
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
                    <div className="space-y-4 h-full">
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

                                {currentConversation?.messages.map(msg => renderMessageBubble(msg))}

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