// lib/wallet/solana.ts
/**
 * Solana blockchain interaction utilities
 * Handles connection to Solana network, balance queries, and transaction operations
 */
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
    Commitment,
    ParsedAccountData,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { WalletBalance } from '@/types/wallet';
import { SolanaNetwork } from '@/types/common';

// USDC Mint address
const USDC_MINT_ADDRESS = `${process.env.NEXT_PUBLIC_USDC_MINT}`;

// Connection instance cache
let cachedConnection: Connection | null = null;
let cachedNetwork: SolanaNetwork | null = null;

/**
 * Get Solana network from environment or default to devnet
 */
export function getSolanaNetwork(): SolanaNetwork {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork;
    return network || 'devnet';
}

/**
 * Get RPC URL for the current network
 */
export function getRpcUrl(): string {
    const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (customRpc) {
        return customRpc;
    }

    const network = getSolanaNetwork();

    // Handle localnet separately as it's not a valid Cluster type
    if (network === 'localnet') {
        return 'http://localhost:8899';
    }

    // clusterApiUrl only accepts 'mainnet-beta', 'devnet', 'testnet'
    return clusterApiUrl(network);
}

/**
 * Get or create a connection to Solana network
 * Caches the connection to avoid creating multiple instances
 */
export function getConnection(commitment: Commitment = 'confirmed'): Connection {
    const currentNetwork = getSolanaNetwork();

    // Return cached connection if network hasn't changed
    if (cachedConnection && cachedNetwork === currentNetwork) {
        return cachedConnection;
    }

    // Create new connection
    const rpcUrl = getRpcUrl();
    cachedConnection = new Connection(rpcUrl, commitment);
    cachedNetwork = currentNetwork;

    return cachedConnection;
}

/**
 * Get SOL balance for a wallet address
 * Returns balance in SOL (not lamports)
 */
export async function getSOLBalance(publicKey: PublicKey): Promise<number> {
    try {
        const connection = getConnection();
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Failed to get SOL balance:', error);
        throw new Error('Unable to retrieve SOL balance. Please check your connection and try again.');
    }
}

/**
 * Get USDC token balance for a wallet address
 * Returns balance in USDC (handles decimals)
 */
export async function getUSDCBalance(publicKey: PublicKey): Promise<number> {
    try {
        const connection = getConnection();
        const network = getSolanaNetwork();
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);

        // Get all token accounts owned by the wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: usdcMint }
        );

        // If no token account exists, balance is 0
        if (tokenAccounts.value.length === 0) {
            return 0;
        }

        // Sum up balances from all USDC token accounts
        const totalBalance = tokenAccounts.value.reduce((sum, account) => {
            const accountData = account.account.data as ParsedAccountData;
            const amount = accountData.parsed?.info?.tokenAmount?.uiAmount || 0;
            return sum + amount;
        }, 0);

        return totalBalance;
    } catch (error) {
        console.error('Failed to get USDC balance:', error);
        throw new Error('Unable to retrieve USDC balance. Please check your connection and try again.');
    }
}

/**
 * Get both SOL and USDC balances for a wallet
 */
export async function getWalletBalances(publicKey: PublicKey): Promise<WalletBalance> {
    try {
        const [sol, usdc] = await Promise.all([
            getSOLBalance(publicKey),
            getUSDCBalance(publicKey),
        ]);

        return {
            sol,
            usdc,
            lastUpdated: new Date(),
        };
    } catch (error) {
        console.error('Failed to get wallet balances:', error);
        if (error instanceof Error) {
            throw error; // Re-throw with the original error message
        }
        throw new Error('Unable to retrieve wallet balances. Please check your connection and try again.');
    }
}

/**
 * Verify if a transaction exists and is confirmed on the blockchain
 */
export async function verifyTransaction(
    signature: string,
    commitment: Commitment = 'confirmed'
): Promise<boolean> {
    try {
        const connection = getConnection(commitment);
        const status = await connection.getSignatureStatus(signature);

        if (!status || !status.value) {
            return false;
        }

        // Check if transaction is confirmed and successful
        return status.value.confirmationStatus === commitment && status.value.err === null;
    } catch (error) {
        console.error('Failed to verify transaction:', error);
        throw new Error('Unable to verify transaction on the blockchain.');
    }
}

/**
 * Get transaction details from the blockchain
 */
export async function getTransactionDetails(signature: string) {
    try {
        const connection = getConnection();
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        return transaction;
    } catch (error) {
        console.error('Failed to get transaction details:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unable to retrieve transaction details.');
    }
}

/**
 * Send and confirm a transaction
 */
export async function sendAndConfirmTransaction(
    transaction: Transaction,
    signature: string
): Promise<string> {
    try {
        const connection = getConnection();

        // Send the signed transaction
        const txid = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(txid, 'confirmed');

        if (confirmation.value.err) {
            throw new Error('Transaction failed on blockchain');
        }

        return txid;
    } catch (error) {
        console.error('Failed to send transaction:', error);
        if (error instanceof Error) {
            throw new Error(`Transaction failed: ${error.message}`);
        }
        throw new Error('Failed to send transaction to the blockchain.');
    }
}

/**
 * Create a USDC transfer transaction
 * Note: This creates the transaction but does not sign or send it
 */
export async function createUSDCTransferTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number
): Promise<Transaction> {
    try {
        const connection = getConnection();
        const network = getSolanaNetwork();
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);

        // Get the token accounts
        const fromTokenAccounts = await connection.getParsedTokenAccountsByOwner(
            fromPublicKey,
            { mint: usdcMint }
        );

        const toTokenAccounts = await connection.getParsedTokenAccountsByOwner(
            toPublicKey,
            { mint: usdcMint }
        );

        if (fromTokenAccounts.value.length === 0) {
            throw new Error('Sender does not have a USDC token account');
        }

        const fromTokenAccount = fromTokenAccounts.value[0].pubkey;
        const toTokenAccount = toTokenAccounts.value.length > 0
            ? toTokenAccounts.value[0].pubkey
            : null;

        // Create transaction
        const transaction = new Transaction();
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;

        // If recipient doesn't have a token account, we would need to create one
        // For simplicity, this implementation assumes the recipient already has one
        if (!toTokenAccount) {
            throw new Error('Recipient does not have a USDC token account');
        }

        // Add transfer instruction
        const TOKEN_2022_PROGRAM_ID = TOKEN_PROGRAM_ID; // Using standard token program

        // Convert USDC amount to token amount (USDC has 6 decimals)
        const tokenAmount = Math.floor(amount * 1_000_000);

        // This is a simplified version - in production you would use @solana/spl-token
        // to create the proper transfer instruction
        throw new Error('USDC transfer implementation pending - use createTransferInstruction from @solana/spl-token');

    } catch (error) {
        console.error('Failed to create USDC transfer transaction:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to create transfer transaction.');
    }
}

/**
 * Check if the connection to Solana network is healthy
 */
export async function checkConnectionHealth(): Promise<boolean> {
    try {
        const connection = getConnection();
        const version = await connection.getVersion();
        return !!version;
    } catch (error) {
        console.error('Connection health check failed:', error);
        return false;
    }
}

/**
 * Get current slot (block height)
 */
export async function getCurrentSlot(): Promise<number> {
    try {
        const connection = getConnection();
        return await connection.getSlot();
    } catch (error) {
        console.error('Failed to get current slot:', error);
        throw new Error('Unable to retrieve blockchain information.');
    }
}