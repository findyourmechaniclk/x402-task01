// types/common.ts
/**
 * Common type definitions (Storage, Network, etc.)
 */
import { Conversation } from './chat';

export interface StorageData {
    conversations: Record<string, Conversation>;
    currentConversationId: string | null;
    walletAddress: string | null;
}

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface NetworkConfig {
    name: SolanaNetwork;
    rpcUrl: string;
    wsUrl?: string;
}