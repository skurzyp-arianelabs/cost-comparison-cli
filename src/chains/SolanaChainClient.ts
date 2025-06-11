import { AbstractChainClient } from './abstract/AbstractChainClient';
import { ChainConfig, SupportedOperation, TransactionResult } from '../types';
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
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
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
    const commitment: Commitment = 'confirmed';
    const accountPrivateKeyBytes = Uint8Array.from(
      JSON.parse(this.credentials.privateKey!)
    );

    const sender = Keypair.fromSecretKey(accountPrivateKeyBytes);
    const connection = new Connection(
      'https://api.devnet.solana.com',
      commitment
    );
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
      connection,
      transaction,
      [sender]
    );

    const transactionDetails = await connection.getParsedTransaction(
      transactionSignature,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    const { fee } = transactionDetails?.meta ?? {};
    console.log(' fee:', fee);

    return {
      chain: 'solana',
      operation: SupportedOperation.TRANSFER_NATIVE_FT,
      transactionHash: transactionSignature,
      gasUsed: '',
      gasPrice: '',
      totalCost: '',
      nativeCurrencySymbol: 'SOL',
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }
}
