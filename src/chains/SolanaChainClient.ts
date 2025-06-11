import { AbstractChainClient } from './abstract/AbstractChainClient';
import {
  ChainConfig,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../types';
import { ConfigService } from '../services/ConfigService';
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';

export class SolanaChainClient extends AbstractChainClient {
  private connection: Connection;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);

    const rpcUrl = chainConfig.rpcUrl || 'https://api.devnet.solana.com';
    const commitment: Commitment = 'confirmed';
    this.connection = new Connection(rpcUrl, commitment);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const version = await this.connection.getVersion();
      return !!version?.['solana-core'];
    } catch (error) {
      console.error('Solana health check failed:', error);
      return false;
    }
  }

  async createNativeFT(): Promise<TransactionResult> {
    const MINT_ACCOUNT_SIZE = 82;

    try {
      const payer = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(this.credentials.privateKey!))
      );
      const mintKeypair = Keypair.generate();
      const decimals = 6;
      const lamports = await getMinimumBalanceForRentExemptMint(
        this.connection
      );

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_ACCOUNT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          payer.publicKey, // mint authority
          null, // freeze authority
          TOKEN_PROGRAM_ID
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintKeypair]
      );

      const txDetails = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      const fee = txDetails?.meta?.fee ?? 0;

      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.CREATE_NATIVE_FT,
        transactionHash: signature,
        gasUsed: fee.toString(),
        totalCost: (fee / LAMPORTS_PER_SOL).toString(),
        nativeCurrencySymbol: this.chainConfig.nativeCurrency,
        timestamp: Date.now().toLocaleString(),
        status: 'success',
      };
    } catch (error: any) {
      console.error('createNativeFT error:', error);
      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.CREATE_NATIVE_FT,
        timestamp: Date.now().toLocaleString(),
        status: 'failed',
        error: error?.message || String(error),
      };
    }
  }

  async associateNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async transferNativeFT(): Promise<TransactionResult> {
    const accountPrivateKeyBytes = Uint8Array.from(
      JSON.parse(this.credentials.privateKey!)
    );

    const sender = Keypair.fromSecretKey(accountPrivateKeyBytes);
    const to = new PublicKey('3hjqHVbLQTaaUyfn6dPKtws33xpPk7ZuigSS9TdBLBHy');
    const amountSol = 0.01;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: to,
        lamports: amountSol * LAMPORTS_PER_SOL,
      })
    );

    const transactionSignature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [sender]
    );

    const transactionDetails = await this.connection.getParsedTransaction(
      transactionSignature,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    const { fee } = transactionDetails?.meta ?? {};
    const isSuccess = transactionDetails?.meta?.err === null;

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.TRANSFER_NATIVE_FT,
      transactionHash: transactionSignature,
      gasUsed: fee?.toString() ?? '',
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      timestamp: Date.now().toLocaleString(),
      status: isSuccess ? 'success' : 'failed',
      error: isSuccess
        ? undefined
        : JSON.stringify(transactionDetails?.meta?.err),
    };
  }
}
