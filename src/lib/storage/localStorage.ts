// src/lib/storage/localStorage.ts - Local storage utilities

import { Conversation, Message, StorageData } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';

// ============================================
// Storage Helper Functions
// ============================================

function isClient(): boolean {
    return typeof window !== 'undefined';
}

function safeGetItem(key: string): string | null {
    if (!isClient()) return null;

    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        return null;
    }
}

function safeSetItem(key: string, value: string): boolean {
    if (!isClient()) return false;

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Error writing to localStorage (${key}):`, error);
        return false;
    }
}

function safeRemoveItem(key: string): void {
    if (!isClient()) return;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing from localStorage (${key}):`, error);
    }
}

// ============================================
// Conversation Management
// ============================================

export function getAllConversations(): Record<string, Conversation> {
    const data = safeGetItem(STORAGE_KEYS.CONVERSATIONS);

    if (!data) {
        return {};
    }

    try {
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects
        Object.values(parsed).forEach((conv: unknown) => {
            const conversation = conv as Conversation;
            conversation.createdAt = new Date(conversation.createdAt);
            conversation.updatedAt = new Date(conversation.updatedAt);

            conversation.messages.forEach(msg => {
                msg.timestamp = new Date(msg.timestamp);
            });
        });

        return parsed;
    } catch (error) {
        console.error('Error parsing conversations:', error);
        return {};
    }
}

export function getConversation(id: string): Conversation | null {
    const conversations = getAllConversations();
    return conversations[id] || null;
}

export function saveConversation(conversation: Conversation): boolean {
    const conversations = getAllConversations();
    conversations[conversation.id] = conversation;

    return safeSetItem(
        STORAGE_KEYS.CONVERSATIONS,
        JSON.stringify(conversations)
    );
}

export function deleteConversation(id: string): boolean {
    const conversations = getAllConversations();
    delete conversations[id];

    return safeSetItem(
        STORAGE_KEYS.CONVERSATIONS,
        JSON.stringify(conversations)
    );
}

export function clearAllConversations(): void {
    safeRemoveItem(STORAGE_KEYS.CONVERSATIONS);
    safeRemoveItem(STORAGE_KEYS.CURRENT_CONVERSATION);
}

// ============================================
// Message Management
// ============================================

export function addMessage(
    conversationId: string,
    message: Message
): boolean {
    const conversation = getConversation(conversationId);

    if (!conversation) {
        console.error('Conversation not found:', conversationId);
        return false;
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    conversation.messageCount = conversation.messages.length;
    conversation.totalCost += message.cost;

    return saveConversation(conversation);
}

export function updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>
): boolean {
    const conversation = getConversation(conversationId);

    if (!conversation) {
        console.error('Conversation not found:', conversationId);
        return false;
    }

    const messageIndex = conversation.messages.findIndex(
        msg => msg.id === messageId
    );

    if (messageIndex === -1) {
        console.error('Message not found:', messageId);
        return false;
    }

    conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates,
    };

    conversation.updatedAt = new Date();

    return saveConversation(conversation);
}

export function getMessages(conversationId: string): Message[] {
    const conversation = getConversation(conversationId);
    return conversation?.messages || [];
}

// ============================================
// Current Conversation
// ============================================

export function getCurrentConversationId(): string | null {
    return safeGetItem(STORAGE_KEYS.CURRENT_CONVERSATION);
}

export function setCurrentConversationId(id: string): boolean {
    return safeSetItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
}

export function getCurrentConversation(): Conversation | null {
    const id = getCurrentConversationId();
    return id ? getConversation(id) : null;
}

// ============================================
// Wallet Address
// ============================================

export function getStoredWalletAddress(): string | null {
    return safeGetItem(STORAGE_KEYS.WALLET_ADDRESS);
}

export function setStoredWalletAddress(address: string): boolean {
    return safeSetItem(STORAGE_KEYS.WALLET_ADDRESS, address);
}

export function clearStoredWalletAddress(): void {
    safeRemoveItem(STORAGE_KEYS.WALLET_ADDRESS);
}

// ============================================
// Conversation Utilities
// ============================================

export function createNewConversation(
    walletAddress: string,
    model: string,
    title?: string
): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation: Conversation = {
        id,
        walletAddress,
        title: title || 'New Conversation',
        model,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        totalCost: 0,
        messageCount: 0,
    };

    return conversation;
}

export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Search and Filter
// ============================================

export function searchConversations(query: string): Conversation[] {
    const conversations = Object.values(getAllConversations());

    if (!query.trim()) {
        return conversations;
    }

    const lowerQuery = query.toLowerCase();

    return conversations.filter(conv => {
        // Search in title
        if (conv.title.toLowerCase().includes(lowerQuery)) {
            return true;
        }

        // Search in messages
        return conv.messages.some(msg =>
            msg.content.toLowerCase().includes(lowerQuery)
        );
    });
}

export function getConversationsByWallet(
    walletAddress: string
): Conversation[] {
    const conversations = Object.values(getAllConversations());

    return conversations.filter(
        conv => conv.walletAddress === walletAddress
    );
}

export function getConversationsByModel(model: string): Conversation[] {
    const conversations = Object.values(getAllConversations());

    return conversations.filter(conv => conv.model === model);
}

// ============================================
// Statistics
// ============================================

export function getTotalMessageCount(): number {
    const conversations = Object.values(getAllConversations());
    return conversations.reduce((total, conv) => total + conv.messageCount, 0);
}

export function getTotalCost(): number {
    const conversations = Object.values(getAllConversations());
    return conversations.reduce((total, conv) => total + conv.totalCost, 0);
}

export function getStorageStats(): {
    conversationCount: number;
    messageCount: number;
    totalCost: number;
    oldestConversation: Date | null;
    newestConversation: Date | null;
} {
    const conversations = Object.values(getAllConversations());

    if (conversations.length === 0) {
        return {
            conversationCount: 0,
            messageCount: 0,
            totalCost: 0,
            oldestConversation: null,
            newestConversation: null,
        };
    }

    const dates = conversations.map(conv => conv.createdAt);

    return {
        conversationCount: conversations.length,
        messageCount: getTotalMessageCount(),
        totalCost: getTotalCost(),
        oldestConversation: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestConversation: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
}

// ============================================
// Export/Import
// ============================================

export function exportAllData(): string {
    const data: StorageData = {
        conversations: getAllConversations(),
        currentConversationId: getCurrentConversationId(),
        walletAddress: getStoredWalletAddress(),
    };

    return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): boolean {
    try {
        const data = JSON.parse(jsonData) as StorageData;

        // Validate data structure
        if (!data.conversations || typeof data.conversations !== 'object') {
            throw new Error('Invalid data format');
        }

        // Save conversations
        safeSetItem(
            STORAGE_KEYS.CONVERSATIONS,
            JSON.stringify(data.conversations)
        );

        // Save current conversation
        if (data.currentConversationId) {
            setCurrentConversationId(data.currentConversationId);
        }

        // Save wallet address
        if (data.walletAddress) {
            setStoredWalletAddress(data.walletAddress);
        }

        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        return false;
    }
}