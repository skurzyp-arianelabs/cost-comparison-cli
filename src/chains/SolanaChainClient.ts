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

  // Native Fungible Token Operations
  async createNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
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
