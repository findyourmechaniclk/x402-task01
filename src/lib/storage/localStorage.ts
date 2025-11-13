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
 * Read conversation metadata only (no messages loaded)
 */
export function getAllConversations(): Record<string, Conversation> {
    const data = safeGetItem(STORAGE_KEYS.CONVERSATIONS);

    if (!data) {
        return {};
    }

    try {
        const parsed = JSON.parse(data);

        // Convert date strings back to Date objects and ensure empty messages array
        Object.values(parsed).forEach((conv: unknown) => {
            const conversation = conv as Conversation;
            conversation.createdAt = new Date(conversation.createdAt);
            conversation.updatedAt = new Date(conversation.updatedAt);
            conversation.messages = []; // Always empty in metadata
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
 * Save conversation metadata only (without messages)
 */
export function saveConversation(conversation: Conversation): boolean {
    const conversations = getAllConversations();

    // Save metadata without messages
    const metadata = {
        ...conversation,
        messages: [] // Never store messages in metadata
    };

    conversations[conversation.id] = metadata;

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
    // Get all conversations to clear their message storage
    const conversations = getAllConversations();

    // Clear individual message stores
    Object.keys(conversations).forEach(convId => {
        const messagesKey = `${STORAGE_KEYS.CONVERSATIONS}_messages_${convId}`;
        safeRemoveItem(messagesKey);
    });

    // Clear main conversation metadata
    safeRemoveItem(STORAGE_KEYS.CONVERSATIONS);
    safeRemoveItem(STORAGE_KEYS.CURRENT_CONVERSATION);
}

// ============================================
// Message Management
// ============================================

/**
 * Add message to separate storage and update conversation metadata
 */
export function addMessage(
    conversationId: string,
    message: Message
): boolean {
    // Get existing messages for this conversation
    const existingMessages = getMessages(conversationId);
    existingMessages.push(message);

    // Save messages separately
    const messagesKey = `${STORAGE_KEYS.CONVERSATIONS}_messages_${conversationId}`;
    const messagesSaved = safeSetItem(messagesKey, JSON.stringify(existingMessages));

    if (!messagesSaved) {
        return false;
    }

    // Update conversation metadata
    const conversation = getConversation(conversationId);
    if (conversation) {
        conversation.updatedAt = new Date();
        conversation.messageCount = existingMessages.length;
        conversation.totalCost += message.cost;

        // Update title from first user message if still "New Conversation"
        if (conversation.title === 'New Conversation' && message.role === 'user') {
            conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }

        return saveConversation(conversation);
    }

    return true;
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
    const messagesKey = `${STORAGE_KEYS.CONVERSATIONS}_messages_${conversationId}`;
    const data = safeGetItem(messagesKey);

    if (!data) {
        return [];
    }

    try {
        const parsed: Message[] = JSON.parse(data) as Message[];

        // Convert date strings back to Date objects
        parsed.forEach((msg) => {
            msg.timestamp = new Date(msg.timestamp);
        });

        return parsed;
    } catch (error) {
        console.error('Error parsing messages for conversation:', conversationId, error);
        return [];
    }
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
 * Get conversations for a wallet and populate with messages
 */
export function getConversationsByWallet(walletAddress: string): Conversation[] {
    const conversations = Object.values(getAllConversations());

    return conversations
        .filter(conv => conv.walletAddress === walletAddress)
        .map(conv => {
            // Load messages for each conversation
            const messages = getMessages(conv.id);
            return {
                ...conv,
                messages
            };
        })
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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