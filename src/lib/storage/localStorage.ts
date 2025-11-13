// src/lib/storage/localStorage.ts - Local storage utilities
/**
 * Local storage utilities to persist conversations, messages, selection state,
 * and the connected wallet address. All operations are guarded to be safe
 * during SSR and to avoid throwing when localStorage is unavailable.
 */

import { Conversation, Message } from '@/types/chat';
import { StorageData } from '@/types/common';
import { STORAGE_KEYS } from '@/config/constants';

// ============================================
// Storage Helper Functions
// ============================================

/**
 * Detects if code is running in a browser. Prevents SSR from accessing
 * window/localStorage.
 */
function isClient(): boolean {
    return typeof window !== 'undefined';
}

/**
 * Safely read a value from localStorage.
 * Returns null when not in a browser or on error.
 */
function safeGetItem(key: string): string | null {
    if (!isClient()) return null;

    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        return null;
    }
}

/**
 * Safely write a value to localStorage.
 * Returns false when not in a browser or on error.
 */
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

/**
 * Safely remove a key from localStorage. No-op on SSR.
 */
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

/**
 * Read all conversations and restore Date instances for conversation and
 * message timestamps.
 */
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

/**
 * Get a single conversation by id.
 */
export function getConversation(id: string): Conversation | null {
    const conversations = getAllConversations();
    return conversations[id] || null;
}

/**
 * Upsert a conversation in storage and persist the full map.
 */
export function saveConversation(conversation: Conversation): boolean {
    const conversations = getAllConversations();
    conversations[conversation.id] = conversation;

    return safeSetItem(
        STORAGE_KEYS.CONVERSATIONS,
        JSON.stringify(conversations)
    );
}

/**
 * Delete a conversation by id and persist the updated map.
 */
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

/**
 * Append a message and update derived metadata (updatedAt, messageCount,
 * totalCost). Returns true on successful persistence.
 */
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

/**
 * Update a message in-place by id with partial fields and bump updatedAt.
 */
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

/**
 * Get the currently selected conversation id.
 */
export function getCurrentConversationId(): string | null {
    return safeGetItem(STORAGE_KEYS.CURRENT_CONVERSATION);
}

/**
 * Set the currently selected conversation id.
 */
export function setCurrentConversationId(id: string): boolean {
    return safeSetItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
}

/**
 * Resolve the currently selected conversation.
 */
export function getCurrentConversation(): Conversation | null {
    const id = getCurrentConversationId();
    return id ? getConversation(id) : null;
}

// ============================================
// Wallet Address
// ============================================

/**
 * Read the persisted wallet address.
 */
export function getStoredWalletAddress(): string | null {
    return safeGetItem(STORAGE_KEYS.WALLET_ADDRESS);
}

/**
 * Persist the connected wallet address.
 */
export function setStoredWalletAddress(address: string): boolean {
    return safeSetItem(STORAGE_KEYS.WALLET_ADDRESS, address);
}

/**
 * Remove the persisted wallet address.
 */
export function clearStoredWalletAddress(): void {
    safeRemoveItem(STORAGE_KEYS.WALLET_ADDRESS);
}

// ============================================
// Conversation Utilities
// ============================================

/**
 * Create a new conversation scaffold for a wallet and model.
 */
export function createNewConversation(
    walletAddress: string,
    model: string,
    title?: string
): Conversation {
    // Use current timestamp as ID
    const id = Date.now().toString();

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

/**
 * Generate a unique-ish message id using timestamp and random suffix.
 */
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Search and Filter
// ============================================

/**
 * Full-text search across conversation titles and message content.
 */
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

/**
 * Filter conversations by wallet address.
 */
export function getConversationsByWallet(
    walletAddress: string
): Conversation[] {
    const conversations = Object.values(getAllConversations());

    return conversations.filter(
        conv => conv.walletAddress === walletAddress
    );
}

/**
 * Filter conversations by model id.
 */
export function getConversationsByModel(model: string): Conversation[] {
    const conversations = Object.values(getAllConversations());

    return conversations.filter(conv => conv.model === model);
}

// ============================================
// Statistics
// ============================================

/**
 * Compute total message count across all conversations.
 */
export function getTotalMessageCount(): number {
    const conversations = Object.values(getAllConversations());
    return conversations.reduce((total, conv) => total + conv.messageCount, 0);
}

/**
 * Sum total cost across all conversations.
 */
export function getTotalCost(): number {
    const conversations = Object.values(getAllConversations());
    return conversations.reduce((total, conv) => total + conv.totalCost, 0);
}

/**
 * Aggregated storage stats for dashboards and diagnostics.
 */
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

/**
 * Export all persisted data as pretty JSON.
 */
export function exportAllData(): string {
    const data: StorageData = {
        conversations: getAllConversations(),
        currentConversationId: getCurrentConversationId(),
        walletAddress: getStoredWalletAddress(),
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Import persisted data from JSON, validating structure before saving.
 */
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