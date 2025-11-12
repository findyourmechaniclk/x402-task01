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
    ParsedInstruction,
} from '@solana/web3.js';
import type { Finality } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
        const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
        });

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

type VerifyOnChainParams = {
    signature: string;
    expectedRecipient: string; // merchant wallet (base58)
    expectedMint: string;      // USDC mint (env)
    expectedAmount: bigint;    // smallest units, e.g. USDC: 6 decimals
    commitment?: Commitment;
};

/**
 * Parse the transaction and ensure it's an SPL USDC transfer
 * to the expected recipient with at least expectedAmount.
 */
export async function verifyTransactionOnChain({
    signature,
    expectedRecipient,
    expectedMint,
    expectedAmount,
    commitment = 'confirmed',
}: VerifyOnChainParams): Promise<boolean> {
    const connection = getConnection(commitment);
    const finality = toFinality(commitment);

    const tx = await connection.getParsedTransaction(signature, {
        commitment: finality,
        maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
        console.warn('⛔ getParsedTransaction returned null for signature', signature);
        return false;
    }
    if (tx.meta?.err) {
        console.warn('⛔ Transaction has error in meta', tx.meta.err);
        return false;
    }

    // Grab *all* spl-token transfers (both transferChecked and transfer)
    const tokenIxs = tx.transaction.message.instructions.filter(
        (ix): ix is ParsedInstruction =>
            'parsed' in ix &&
            (ix as ParsedInstruction).program === 'spl-token' &&
            ((ix as ParsedInstruction).parsed?.type === 'transferChecked' ||
                (ix as ParsedInstruction).parsed?.type === 'transfer')
    );

    if (tokenIxs.length === 0) {
        console.warn('⛔ No spl-token transfer instructions found');
        return false;
    }

    const merchant = new PublicKey(expectedRecipient);
    const mintPk = new PublicKey(expectedMint);

    // We’ll compute the *exact* expected ATA and compare it to the transfer destination
    // allowOwnerOffCurve=true to be safe with PDAs/custody setups.
    const expectedAta = await getAssociatedTokenAddress(
        mintPk,
        merchant,
        true /* allowOwnerOffCurve */,
        TOKEN_PROGRAM_ID
    );

    // Iterate transfers; accept the first one that fully matches (mint, ATA, amount>=)
    for (const ix of tokenIxs) {
        const parsed: any = (ix as ParsedInstruction).parsed;
        const kind: string = parsed?.type;

        // Normalized fields by kind
        let mint: string | undefined;
        let destination: string | undefined;
        let rawAmount: bigint | undefined;

        if (kind === 'transferChecked') {
            mint = parsed.info?.mint;
            destination = parsed.info?.destination;
            const amtStr = parsed.info?.tokenAmount?.amount;
            rawAmount = amtStr ? BigInt(amtStr) : undefined;
        } else if (kind === 'transfer') {
            // For plain `transfer`, `mint` is very often omitted in parsed.info.
            // We’ll read the destination token account to resolve its mint.
            destination = parsed.info?.destination;
            const amtStr = parsed.info?.amount;
            rawAmount = amtStr ? BigInt(amtStr) : undefined;

            if (destination) {
                const destPk = new PublicKey(destination);
                const destInfo = await connection.getParsedAccountInfo(destPk, finality);
                const mintStr =
                    (destInfo.value?.data as ParsedAccountData | null)?.parsed?.info?.mint;
                mint = typeof mintStr === 'string' ? mintStr : undefined;
            }
        }

        console.log('🔎 Found spl-token ix:', {
            type: kind,
            mint,
            destination,
            rawAmount: rawAmount?.toString(),
            expectedMint,
            expectedAta: expectedAta.toBase58(),
            expectedAmount: expectedAmount.toString(),
        });

        if (!destination || rawAmount === undefined) continue;

        const destPk = new PublicKey(destination);
        const isExactAta = destPk.equals(expectedAta);

        // If the destination is exactly the expected ATA, the mint is *implicitly* the expected mint.
        // (We still prefer to compare if we have it.)
        if (!mint && !isExactAta) continue;
        if (mint && mint !== expectedMint) continue;


        //const destPk = new PublicKey(destination);

        // Prefer exact ATA match (most robust)
        if (!destPk.equals(expectedAta)) {
            // Optional fallback: verify destination is owned by merchant wallet
            // (fetching parsed account owner)
            const destInfo = await connection.getParsedAccountInfo(destPk, finality);
            const ownerFromParsed =
                (destInfo.value?.data as ParsedAccountData | null)?.parsed?.info?.owner;
            const ownerEq = ownerFromParsed && new PublicKey(ownerFromParsed).equals(merchant);
            console.log('… destination != expected ATA. Owner check:', { ownerFromParsed, ownerEq });
            if (!ownerEq) continue; // not merchant-owned, reject this ix
        }

        if (rawAmount < expectedAmount) {
            console.warn('⛔ Amount too small:', rawAmount.toString(), '<', expectedAmount.toString());
            continue;
        }

        console.log('✅ Matching transfer found. Verification OK.');
        return true;
    }

    console.warn('⛔ No matching transfer (mint/recipient/amount) found among spl-token ixs');

    console.warn('⛔ No matching transfer (mint/recipient/amount) found among spl-token ixs');

    // ---- Fallback: verify by token balance delta on the recipient ATA ----
    try {
        // 1) Build accountKeys array (base58) to index into token balance entries
        const accountKeys: string[] =
            // Parsed tx has objects with {pubkey: string}
            (tx.transaction.message.accountKeys as any[]).map((k) =>
                typeof k === 'string' ? k : k.pubkey
            );

        // 2) Find the expected ATA index in the message
        const ataIndex = accountKeys.findIndex((k) => k === expectedAta.toBase58());
        if (ataIndex === -1) {
            console.warn('⚠️ Expected ATA not present in message accountKeys, cannot delta-check');
            return false;
        }

        // 3) Pull pre/post token balance rows for that index & mint
        const pre = (tx.meta?.preTokenBalances || []).find(
            (b) => b.accountIndex === ataIndex && b.mint === expectedMint
        );
        const post = (tx.meta?.postTokenBalances || []).find(
            (b) => b.accountIndex === ataIndex && b.mint === expectedMint
        );

        // If the ATA was created in this tx, there may be no 'pre' record.
        const preAmount = pre?.uiTokenAmount?.amount
            ? BigInt(pre.uiTokenAmount.amount)
            : BigInt(0);
        const postAmount = post?.uiTokenAmount?.amount
            ? BigInt(post.uiTokenAmount.amount)
            : BigInt(0);

        const delta = postAmount - preAmount;

        console.log('🧮 Balance-delta fallback:', {
            expectedAta: expectedAta.toBase58(),
            expectedMint,
            preAmount: preAmount.toString(),
            postAmount: postAmount.toString(),
            delta: delta.toString(),
            expectedAmount: expectedAmount.toString(),
        });

        if (delta >= expectedAmount) {
            console.log('✅ Balance delta meets or exceeds expected amount. Verification OK.');
            return true;
        }

        console.warn('⛔ Balance delta too small:', delta.toString(), '<', expectedAmount.toString());
        return false;
    } catch (e) {
        console.warn('⚠️ Balance-delta fallback failed:', e);
        return false;
    }
}



// helper to convert Commitment → Finality
function toFinality(commitment: Commitment): Finality {
    switch (commitment) {
        // legacy/alias commitments that should be treated as "confirmed"
        case 'processed':
        case 'recent':
        case 'single':
        case 'singleGossip':
        case 'confirmed':
            return 'confirmed';
        // commitments that map to "finalized"
        case 'finalized':
        case 'root':
        case 'max':
            return 'finalized';
        default:
            return 'confirmed';
    }
}