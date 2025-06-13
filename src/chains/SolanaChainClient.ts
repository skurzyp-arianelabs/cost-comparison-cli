import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createV1,
  mintV1,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  signerIdentity,
  publicKey as getMetaplexPublicKey,
} from '@metaplex-foundation/umi';
import BigNumber from 'bignumber.js';
import bs58 from 'bs58';
import { AbstractChainClient } from './abstract/AbstractChainClient';
import {
  ExtendedChain,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../types';
import { ConfigService } from '../services/ConfigService/ConfigService';
import { SolanaWalletService } from '../services/WalletServices/SolanaWalletService';
import { calculateUsdCost } from '../utils/calculateUsdCost';

const MINT_ACCOUNT_SIZE = 82; // Size (in bytes) of the Mint account required by SPL Token program

const metadata = {
  name: 'MyNFT',
  symbol: 'MYNFT',
  uri: 'https://ipfs.io/ipfs/QmTW9HWfb2wsQqEVJiixkQ73Nsfp2Rx4ESaDSiQ7ThwnFM',
};

export class SolanaChainClient extends AbstractChainClient {
  private connection: Connection;
  private solPriceUSD!: BigNumber;

  constructor(chainConfig: ExtendedChain, configService: ConfigService) {
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

    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );
    const mintKeypair = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(this.connection);

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
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: createSignature,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;

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

    const ata = getAssociatedTokenAddressSync(mintAccount, recipient.publicKey);

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
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: signature,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async mintNativeFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;

    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );
    const mintKeypair = Keypair.generate();
    const decimals = 6;
    const lamports = await getMinimumBalanceForRentExemptMint(this.connection);

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
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.MINT_NATIVE_FT,
      transactionHash: createSignature,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async transferNativeFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;

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
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.TRANSFER_NATIVE_FT,
      transactionHash: transferSignature,
      gasUsed: fee?.toString() ?? '',
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async createERC20_RPC(): Promise<TransactionResult> {
    const result = await this.createNativeFT();
    return { ...result, operation: SupportedOperation.CREATE_ERC20_HARDHAT };
  }

  async mintERC20_RPC(): Promise<TransactionResult> {
    const result = await this.mintNativeFT();
    return { ...result, operation: SupportedOperation.MINT_ERC20_HARDHAT };
  }

  async transferERC20_RPC(): Promise<TransactionResult> {
    const result = await this.transferNativeFT();
    return { ...result, operation: SupportedOperation.TRANSFER_ERC20_HARDHAT };
  }

  async createNativeNFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;
    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );

    const umi = createUmi(this.connection.rpcEndpoint);
    const umiWalletSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
    );
    umi.use(signerIdentity(umiWalletSigner));
    umi.use(mplTokenMetadata());

    const mintSigner = generateSigner(umi);
    const splTokenProgram = umi.programs.getPublicKey(
      TOKEN_PROGRAM_ID.toBase58()
    );

    const transaction = createV1(umi, {
      mint: mintSigner,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      splTokenProgram,
    });

    const result = await transaction.sendAndConfirm(umi);
    const signatureBase58 = bs58.encode(result.signature as Uint8Array);

    const txDetails = await this.connection.getParsedTransaction(
      signatureBase58,
      { maxSupportedTransactionVersion: 0 }
    );

    const fee = txDetails?.meta?.fee ?? 0;
    await this.fetchSolPrice();
    const usdCost = calculateUsdCost(
      fee,
      this.solPriceUSD,
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.CREATE_NATIVE_NFT,
      transactionHash: signatureBase58,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;
    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );

    const umi = createUmi(this.connection.rpcEndpoint);
    const umiWalletSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
    );
    umi.use(signerIdentity(umiWalletSigner));
    umi.use(mplTokenMetadata());

    const mintSigner = generateSigner(umi);
    const splTokenProgram = umi.programs.getPublicKey(
      TOKEN_PROGRAM_ID.toBase58()
    );

    await createV1(umi, {
      mint: mintSigner,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      splTokenProgram,
    }).sendAndConfirm(umi);

    const ataAddress = getAssociatedTokenAddressSync(
      new PublicKey(mintSigner.publicKey),
      payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ataAddress,
      payer.publicKey,
      new PublicKey(mintSigner.publicKey),
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(ataInstruction);

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
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.ASSOCIATE_NATIVE_NFT,
      transactionHash: signature,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;
    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );

    const umi = createUmi(this.connection.rpcEndpoint);
    const umiWalletSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
    );
    umi.use(signerIdentity(umiWalletSigner));
    umi.use(mplTokenMetadata());

    const umiMint = generateSigner(umi);
    const mint = Keypair.fromSecretKey(umiMint.secretKey);

    const mintPublicKey = new PublicKey(umiMint.publicKey);

    const splTokenProgram = umi.programs.getPublicKey(
      TOKEN_PROGRAM_ID.toBase58()
    );

    await createV1(umi, {
      mint: umiMint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      splTokenProgram,
    }).sendAndConfirm(umi);

    const ataAddress = getAssociatedTokenAddressSync(
      mintPublicKey,
      payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ataAddress,
      payer.publicKey,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataTx = new Transaction().add(ataInstruction);
    await sendAndConfirmTransaction(this.connection, ataTx, [payer]);

    const mintTransaction = mintV1(umi, {
      mint: getMetaplexPublicKey(mint.publicKey),
      authority: umi.identity,
      amount: 1,
      tokenOwner: getMetaplexPublicKey(payer.publicKey.toBase58()),
      tokenStandard: TokenStandard.NonFungible,
      splTokenProgram,
    });

    const result = await mintTransaction.sendAndConfirm(umi, {
      send: { skipPreflight: true },
    });
    const signatureBase58 = bs58.encode(result.signature as Uint8Array);

    const txDetails = await this.connection.getParsedTransaction(
      signatureBase58,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    const fee = txDetails?.meta?.fee ?? 0;
    await this.fetchSolPrice();

    const usdCost = calculateUsdCost(
      fee,
      this.solPriceUSD,
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.MINT_NATIVE_NFT,
      transactionHash: signatureBase58,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    const solanaWalletService = this.walletService as SolanaWalletService;
    const { privateKey } = await solanaWalletService.createAccount();
    const payer = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );

    const umi = createUmi(this.connection.rpcEndpoint);
    const umiWalletSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
    );
    umi.use(signerIdentity(umiWalletSigner));
    umi.use(mplTokenMetadata());

    const mintSigner = generateSigner(umi);
    const mintPublicKey = new PublicKey(mintSigner.publicKey);
    const splTokenProgram = umi.programs.getPublicKey(
      TOKEN_PROGRAM_ID.toBase58()
    );

    await createV1(umi, {
      mint: mintSigner,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      splTokenProgram,
    }).sendAndConfirm(umi);

    const recipientKeypair = Keypair.generate();

    const ataAddress = getAssociatedTokenAddressSync(
      mintPublicKey,
      recipientKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ataAddress,
      recipientKeypair.publicKey,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataTx = new Transaction().add(ataIx);
    await sendAndConfirmTransaction(this.connection, ataTx, [payer]);

    await mintV1(umi, {
      mint: getMetaplexPublicKey(mintSigner.publicKey),
      authority: umi.identity,
      amount: 1,
      tokenOwner: getMetaplexPublicKey(payer.publicKey.toBase58()),
      tokenStandard: TokenStandard.NonFungible,
      splTokenProgram,
    }).sendAndConfirm(umi, { send: { skipPreflight: true } });

    const senderAta = getAssociatedTokenAddressSync(
      mintPublicKey,
      payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transfer = createTransferCheckedInstruction(
      senderAta,
      mintPublicKey,
      ataAddress,
      payer.publicKey,
      1, // amount
      0, // decimals
      [], // no additional signers
      TOKEN_PROGRAM_ID
    );

    const transferTx = new Transaction().add(transfer);
    const transferSignature = await sendAndConfirmTransaction(
      this.connection,
      transferTx,
      [payer]
    );

    const txDetails = await this.connection.getParsedTransaction(
      transferSignature,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    const fee = txDetails?.meta?.fee ?? 0;
    await this.fetchSolPrice();
    const usdCost = calculateUsdCost(
      fee,
      this.solPriceUSD,
      this.chainConfig.nativeCurrency.decimals
    );

    return {
      chain: SupportedChain.SOLANA,
      operation: SupportedOperation.TRANSFER_NATIVE_NFT,
      transactionHash: transferSignature,
      gasUsed: fee.toString(),
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: Date.now().toLocaleString(),
      status: 'success',
    };
  }
}
