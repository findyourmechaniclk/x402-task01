// types/components.ts
/**
 * Component Props type definitions
 */
import { Message } from './chat';
import { ModelConfig } from './models';

export interface ChatInterfaceProps {
    model?: string;
    onModelChange?: (model: string) => void;
    onCostChange?: (cost: number) => void;
}

export interface WalletButtonProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary';
    onConnect?: (address: string) => void;
    onDisconnect?: () => void;
}

export interface MessageListProps {
    messages: Message[];
    loading?: boolean;
    onRetry?: (messageId: string) => void;
}

export interface InputAreaProps {
    disabled?: boolean;
    placeholder?: string;
    maxLength?: number;
    onSend: (message: string) => Promise<void>;
    onCancel?: () => void;
}

export interface ModelSelectorProps {
    selectedModel: string;
    models: ModelConfig[];
    onSelect: (modelId: string) => void;
    disabled?: boolean;
}

export interface CostDisplayProps {
    message: string;
    model: string;
    estimatedCost: number;
    currentBalance: number;
}