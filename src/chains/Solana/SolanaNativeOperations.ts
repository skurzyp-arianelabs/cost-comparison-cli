import bs58 from 'bs58';
import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { ISolanaNativeOperations } from './ISolanaNativeOperations';
import {
  AccountData,
  ChainConfig,
  SupportedChain,
  TransactionResult,
} from '../../types';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  transfer,
} from '@solana/spl-token';
import {
  DECIMALS,
  MEMO_PROGRAM_ID,
  MINT_ACCOUNT_SIZE,
  MINT_NATIVE_FT_AMOUNT,
  TRANSFER_AMOUNT_LAMPORTS,
  metadata,
} from './constants';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  signerIdentity,
  Umi,
  publicKey as getMetaplexPublicKey,
} from '@metaplex-foundation/umi';
import {
  createV1,
  mintV1,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { MEMO_TEXT } from '../../utils/constants';

export class SolanaNativeOperations implements ISolanaNativeOperations {
  private configService: ConfigService;
  private chainConfig: ChainConfig;
  private connection: Connection;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.chainConfig = configService.getChainConfig(SupportedChain.SOLANA);
    this.connection = this.initClient();
  }

  protected initClient(): Connection {
    const rpcUrl = this.chainConfig.rpcUrls.default.http[0]!;
    const commitment: Commitment = 'confirmed';
    return new Connection(rpcUrl, commitment);
  }

  public async createAccount(): Promise<AccountData> {
    const privateKeyHex = this.configService.getWalletCredentials(
      SupportedChain.SOLANA
    ).privateKey!;
    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKeyHex, 'hex'))
    );

    return {
      accountAddress: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBase58(),
      privateKey: privateKeyHex,
    };
  }

  // Helper method to format the transaction results
  private async formatTransactionResult(
    transactionSignature: string
  ): Promise<TransactionResult> {
    const txDetails = await this.connection.getParsedTransaction(
      transactionSignature,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    const fee = txDetails?.meta?.fee ?? 0;

    return {
      transactionHash: transactionSignature,
      totalCost: (fee / LAMPORTS_PER_SOL).toString(),
      timestamp: txDetails?.blockTime?.toString()!,
      status: 'success',
    };
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

  private async getPayerFromWalletService(): Promise<Keypair> {
    const { privateKey } = await this.createAccount();
    return Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKey, 'hex'))
    );
  }

  private initUmi(payer: Keypair) {
    const umi = createUmi(this.connection.rpcEndpoint);
    const umiWalletSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(payer.secretKey)
    );
    umi.use(signerIdentity(umiWalletSigner));
    umi.use(mplTokenMetadata());
    return umi;
  }

  private async associateTokenAccount(
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
  ): Promise<{ ataAddress: PublicKey; signature: string }> {
    const ataAddress = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ataAddress,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(ataInstruction);

    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      payer,
    ]);
    return { ataAddress, signature };
  }

  private createNFT(umi: Umi) {
    const mintSigner = generateSigner(umi);
    const splTokenProgram = umi.programs.getPublicKey(
      TOKEN_PROGRAM_ID.toBase58()
    );
    const createTransaction = createV1(umi, {
      mint: mintSigner,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      splTokenProgram,
    });
    return { mintSigner, createTransaction, splTokenProgram };
  }

  async createNativeFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();

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

    return this.formatTransactionResult(createSignature);
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();

    const mintAccount = await createMint(
      this.connection,
      payer,
      payer.publicKey, // mint authority
      null, // freeze authority
      DECIMALS
    );

    const recipient = Keypair.generate();
    const { signature } = await this.associateTokenAccount(
      payer,
      mintAccount,
      recipient.publicKey
    );

    return this.formatTransactionResult(signature);
  }

  async mintNativeFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
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

    const mintTx = new Transaction().add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
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

    return this.formatTransactionResult(mintSignature);
  }

  async transferNativeFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();

    const mint = await createMint(
      this.connection,
      payer,
      payer.publicKey, // mint authority
      null, // freeze authority
      DECIMALS
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
      TRANSFER_AMOUNT_LAMPORTS
    );

    const transferSignature = await transfer(
      this.connection,
      payer,
      senderTokenAccount.address,
      recipientTokenAccount.address,
      payer,
      TRANSFER_AMOUNT_LAMPORTS
    );

    return this.formatTransactionResult(transferSignature);
  }

  async createNativeNFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
    const umi = this.initUmi(payer);

    const { createTransaction } = this.createNFT(umi);
    const result = await createTransaction.sendAndConfirm(umi);
    const signatureBase58 = bs58.encode(result.signature as Uint8Array);

    return this.formatTransactionResult(signatureBase58);
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
    const umi = this.initUmi(payer);

    const { mintSigner, createTransaction } = this.createNFT(umi);
    await createTransaction.sendAndConfirm(umi);

    const { signature } = await this.associateTokenAccount(
      payer,
      new PublicKey(mintSigner.publicKey),
      payer.publicKey
    );

    return this.formatTransactionResult(signature);
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
    const umi = this.initUmi(payer);

    const { mintSigner, createTransaction, splTokenProgram } =
      this.createNFT(umi);
    await createTransaction.sendAndConfirm(umi);

    const mintPublicKey = new PublicKey(mintSigner.publicKey);
    const mint = Keypair.fromSecretKey(mintSigner.secretKey);

    await this.associateTokenAccount(payer, mintPublicKey, payer.publicKey);

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

    return this.formatTransactionResult(signatureBase58);
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
    const umi = this.initUmi(payer);

    const { mintSigner, createTransaction, splTokenProgram } =
      this.createNFT(umi);
    await createTransaction.sendAndConfirm(umi);

    const mintPublicKey = new PublicKey(mintSigner.publicKey);

    const recipientKeypair = Keypair.generate();

    const { ataAddress } = await this.associateTokenAccount(
      payer,
      mintPublicKey,
      recipientKeypair.publicKey
    );

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

    return this.formatTransactionResult(transferSignature);
  }

  async submitMemoMessage(): Promise<TransactionResult> {
    const payer = await this.getPayerFromWalletService();
    const recipient = Keypair.generate();

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: MINT_NATIVE_FT_AMOUNT,
      }),
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports: TRANSFER_AMOUNT_LAMPORTS,
      }),
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(MEMO_TEXT, 'utf-8'),
      })
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      payer,
    ]);

    return this.formatTransactionResult(signature);
  }
}
