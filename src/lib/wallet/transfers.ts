// src/lib/wallet/transfers.ts
import {
    Connection,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
    Keypair,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAccount,
    getMint,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
} from '@solana/spl-token';
import { createConnection, getUsdcMintAddress } from '@/lib/solana/connection';

/**
 * Create and send a USDC transfer transaction
 * This requires the sender to sign the transaction with their wallet
 */
export async function createUSDCTransferTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number // Amount in USDC (e.g., 0.01 for $0.01)
): Promise<Transaction> {
    const connection = createConnection();
    const usdcMint = getUsdcMintAddress();

    // Convert USDC amount to token amount using dynamic mint decimals
    let decimals = 6;
    try {
        const mintInfo = await getMint(connection, usdcMint);
        decimals = typeof mintInfo.decimals === 'number' ? mintInfo.decimals : 6;
        console.log('USDC mint decimals:', decimals);
    } catch (e) {
        console.warn('Unable to fetch USDC mint decimals, defaulting to 6:', e);
    }
    const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

    // Get associated token addresses
    const fromTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        fromPublicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        toPublicKey
    );

    const transaction = new Transaction();

    // Check if recipient has token account, create if needed
    try {
        await getAccount(connection, toTokenAccount);
    } catch (error) {
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            // Create associated token account for recipient
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPublicKey, // payer
                    toTokenAccount, // associated token account
                    toPublicKey, // owner
                    usdcMint // mint
                )
            );
        } else {
            throw error;
        }
    }

    // Add transfer instruction
    transaction.add(
        createTransferInstruction(
            fromTokenAccount, // source
            toTokenAccount, // destination
            fromPublicKey, // owner of source account
            tokenAmount // amount
        )
    );

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPublicKey;

    return transaction;
}

/**
 * Send a pre-signed transaction to the network
 */
export async function sendSignedTransaction(
    signedTransaction: Transaction
): Promise<string> {
    const connection = createConnection();

    const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
    );

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
        throw new Error('Transaction failed on blockchain');
    }

    return signature;
}

/**
 * Check if an account has sufficient USDC balance
 */
export async function checkUSDCBalance(
    publicKey: PublicKey,
    requiredAmount: number
): Promise<{ hasBalance: boolean; currentBalance: number }> {
    try {
        const connection = createConnection();
        const usdcMint = getUsdcMintAddress();

        const tokenAccount = await getAssociatedTokenAddress(
            usdcMint,
            publicKey
        );

        const account = await getAccount(connection, tokenAccount);
        // Resolve mint decimals dynamically (fallback to 6)
        let decimals = 6;
        try {
            const mintInfo = await getMint(connection, usdcMint);
            decimals = typeof mintInfo.decimals === 'number' ? mintInfo.decimals : 6;
        } catch (e) {
            console.warn('Unable to fetch USDC mint decimals, defaulting to 6:', e);
        }
        const currentBalance = Number(account.amount) / Math.pow(10, decimals);

        return {
            hasBalance: currentBalance >= requiredAmount,
            currentBalance
        };
    } catch (error) {
        console.error('Error checking balance:', error);
        return { hasBalance: false, currentBalance: 0 };
    }
}