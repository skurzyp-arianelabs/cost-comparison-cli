import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from '@solana/spl-token';
import BigNumber from 'bignumber.js';
import { AbstractChainClient } from './abstract/AbstractChainClient';
import {
  ChainConfig,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../types';
import { ConfigService } from '../services/ConfigService';
import { SolanaWalletService } from '../services/WalletServices/SolanaWalletService';
import { calculateUsdCost } from '../utils/calculateUsdCost';

const MINT_ACCOUNT_SIZE = 82; // Size (in bytes) of the Mint account required by SPL Token program

export class SolanaChainClient extends AbstractChainClient {
  private connection: Connection;
  private solPriceUSD!: BigNumber;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    const solanaWalletService = new SolanaWalletService(configService);
    super(chainConfig, configService, solanaWalletService);
    this.connection = solanaWalletService.getClient();
  }

  private async fetchSolPrice(): Promise<void> {
    if (!this.solPriceUSD) {
      const solPrice = await this.coinGeckoApiService.getSolPriceInUsd();
      this.solPriceUSD = new BigNumber(solPrice.solana.usd);
    }
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
    const solanaWalletService = this.walletService as SolanaWalletService;

    try {
      const { privateKey } = await solanaWalletService.createAccount();
      const payer = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(privateKey, 'hex'))
      );
      const mintKeypair = Keypair.generate();
      const lamports = await getMinimumBalanceForRentExemptMint(
        this.connection
      );

      const createTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_ACCOUNT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      const createSignature = await sendAndConfirmTransaction(
        this.connection,
        createTx,
        [payer, mintKeypair]
      );

      const txDetails = await this.connection.getParsedTransaction(
        createSignature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

      const fee = txDetails?.meta?.fee ?? 0;
      await this.fetchSolPrice();
      const usdCost = calculateUsdCost(
        fee,
        this.solPriceUSD,
        this.chainConfig.decimals
      );

      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.CREATE_NATIVE_FT,
        transactionHash: createSignature,
        gasUsed: fee.toString(),
        totalCost: (fee / LAMPORTS_PER_SOL).toString(),
        usdCost,
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
    const solanaWalletService = this.walletService as SolanaWalletService;

    try {
      const { privateKey } = await solanaWalletService.createAccount();
      const payer = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(privateKey, 'hex'))
      );

      const mintAccount = await createMint(
        this.connection,
        payer,
        payer.publicKey, // mint authority
        null, // freeze authority
        6
      );

      const recipient = Keypair.generate();

      const ata = getAssociatedTokenAddressSync(
        mintAccount,
        recipient.publicKey
      );

      const associateIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        recipient.publicKey,
        mintAccount
      );

      const tx = new Transaction().add(associateIx);

      const signature = await sendAndConfirmTransaction(this.connection, tx, [
        payer,
      ]);

      const txDetails = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      const fee = txDetails?.meta?.fee ?? 0;
      await this.fetchSolPrice();
      const usdCost = calculateUsdCost(
        fee,
        this.solPriceUSD,
        this.chainConfig.decimals
      );

      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
        transactionHash: signature,
        gasUsed: fee.toString(),
        totalCost: (fee / LAMPORTS_PER_SOL).toString(),
        usdCost,
        nativeCurrencySymbol: this.chainConfig.nativeCurrency,
        timestamp: Date.now().toLocaleString(),
        status: 'success',
      };
    } catch (error: any) {
      console.error('associateNativeFT error:', error);
      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
        timestamp: Date.now().toLocaleString(),
        status: 'failed',
        error: error?.message || String(error),
      };
    }
  }

  async mintNativeFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;

    try {
      const { privateKey } = await solanaWalletService.createAccount();
      const payer = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(privateKey, 'hex'))
      );
      const mintKeypair = Keypair.generate();
      const decimals = 6;
      const lamports = await getMinimumBalanceForRentExemptMint(
        this.connection
      );

      const createTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_ACCOUNT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      const createSignature = await sendAndConfirmTransaction(
        this.connection,
        createTx,
        [payer, mintKeypair]
      );

      const mintTx = new Transaction().add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          payer.publicKey, // mint authority
          null, // freeze authority
          TOKEN_PROGRAM_ID
        )
      );

      const mintSignature = await sendAndConfirmTransaction(
        this.connection,
        mintTx,
        [payer]
      );

      const mintTxDetails = await this.connection.getParsedTransaction(
        mintSignature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

      const fee = mintTxDetails?.meta?.fee ?? 0;
      await this.fetchSolPrice();
      const usdCost = calculateUsdCost(
        fee,
        this.solPriceUSD,
        this.chainConfig.decimals
      );

      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.MINT_NATIVE_FT,
        transactionHash: createSignature,
        gasUsed: fee.toString(),
        totalCost: (fee / LAMPORTS_PER_SOL).toString(),
        usdCost,
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

  async transferNativeFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;

    try {
      const { privateKey } = await solanaWalletService.createAccount();
      const payer = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(privateKey, 'hex'))
      );

      const mint = await createMint(
        this.connection,
        payer,
        payer.publicKey, // mint authority
        null, // freeze authority
        6
      );

      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        payer.publicKey
      );

      const recipientKeypair = Keypair.generate();
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        recipientKeypair.publicKey
      );

      await mintTo(
        this.connection,
        payer,
        mint,
        senderTokenAccount.address,
        payer,
        1_000_000
      );

      const transferSignature = await transfer(
        this.connection,
        payer,
        senderTokenAccount.address,
        recipientTokenAccount.address,
        payer,
        1_000_000
      );

      const txDetails = await this.connection.getParsedTransaction(
        transferSignature,
        { maxSupportedTransactionVersion: 0 }
      );
      const fee = txDetails?.meta?.fee ?? 0;
      await this.fetchSolPrice();
      const usdCost = calculateUsdCost(
        fee,
        this.solPriceUSD,
        this.chainConfig.decimals
      );

      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.TRANSFER_NATIVE_FT,
        transactionHash: transferSignature,
        gasUsed: fee?.toString() ?? '',
        usdCost,
        nativeCurrencySymbol: this.chainConfig.nativeCurrency,
        timestamp: Date.now().toLocaleString(),
        status: 'success',
      };
    } catch (error: any) {
      console.error('transferNativeFT error:', error);
      return {
        chain: SupportedChain.SOLANA,
        operation: SupportedOperation.TRANSFER_NATIVE_FT,
        timestamp: Date.now().toLocaleString(),
        status: 'failed',
        error: error?.message || String(error),
      };
    }
  }
}
