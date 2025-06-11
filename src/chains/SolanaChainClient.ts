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
import { SolanaWalletService } from '../services/WalletServices/SolanaWalletService';

export class SolanaChainClient extends AbstractChainClient {
  private connection: Connection;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    const solanaWalletService = new SolanaWalletService(configService);
    super(chainConfig, configService, solanaWalletService);
    this.connection = solanaWalletService.getClient();
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
    const solanaWalletService = this.walletService as SolanaWalletService;

    try {
      const payer = solanaWalletService.getKeypair();
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
    const solanaWalletService = this.walletService as SolanaWalletService;
    const sender = solanaWalletService.getKeypair();
    // TODO: hardcoded wallet to change
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
