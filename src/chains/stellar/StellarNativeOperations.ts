import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from 'stellar-sdk';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import {
  AccountData,
  ChainConfig,
  SupportedChain,
  TransactionResult,
  WalletCredentials,
} from '../../types';
import { IStellarNativeOperations } from './IStellarNativeOperations';
import { STELLAR_TX_TIMEOUT_SECONDS } from './constants';
import { MEMO_TEXT_28_BYTES } from '../../utils/constants';

function getStellarNetworkPassphrase(network: string): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

export class StellarNativeOperations implements IStellarNativeOperations {
  private configService: ConfigService;
  private chainConfig: ChainConfig;
  private readonly server: Horizon.Server;
  private readonly issuerKeypair: Keypair;
  private readonly networkPassphrase: string;
  private distributorCreationLock: Promise<void> = Promise.resolve();
  private accountCreationPromise: Promise<void> = Promise.resolve();

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.chainConfig = configService.getChainConfig(SupportedChain.STELLAR);
    this.server = new Horizon.Server(this.chainConfig.rpcUrls.default.http[0]!);
    const credentials: WalletCredentials =
      this.configService.getWalletCredentials(SupportedChain.STELLAR);
    this.issuerKeypair = Keypair.fromSecret(credentials.privateKey!);

    this.networkPassphrase = getStellarNetworkPassphrase(
      this.chainConfig.network
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      const feeStats = await this.server.feeStats();

      return typeof feeStats?.last_ledger_base_fee !== 'undefined';
    } catch (error) {
      console.error('Stellar Health check failed:', error);
      return false;
    }
  }

  // Ensures that only one createAccount operation runs at a time & prevents race conditions when issuerAccount is being reused in parallel.
  private async withAccountCreationMutex<T>(fn: () => Promise<T>): Promise<T> {
    let resolveCurrent!: () => void;

    const previous = this.accountCreationPromise;

    this.accountCreationPromise = new Promise((resolve) => {
      resolveCurrent = resolve;
    });

    await previous;

    try {
      return await fn();
    } finally {
      resolveCurrent();
    }
  }

  public async createAccount(): Promise<AccountData> {
    return this.withAccountCreationMutex(async () => {
      const newKeypair = Keypair.random();
      const issuerAccount = await this.server.loadAccount(
        this.issuerKeypair.publicKey()
      );

      const tx = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.createAccount({
            destination: newKeypair.publicKey(),
            startingBalance: '3.0000000',
          })
        )
        .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
        .build();

      tx.sign(this.issuerKeypair);
      await this.server.submitTransaction(tx);

      return {
        accountAddress: newKeypair.publicKey(),
        privateKey: newKeypair.secret(),
        publicKey: newKeypair.publicKey(),
      };
    });
  }

  // Helper method to format the transaction results
  private async formatTransactionResult(
    response: Horizon.HorizonApi.SubmitTransactionResponse
  ): Promise<TransactionResult> {
    const txDetails = await this.server
      .transactions()
      .transaction(response.hash as string)
      .call();

    const fee = parseInt(txDetails.fee_charged as string);

    return {
      transactionHash: txDetails.hash,
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      timestamp: Math.floor(
        new Date(txDetails.created_at).getTime() / 1000
      ).toString(),
      status: 'success',
    };
  }

  private async prepareStellarAssetContext(assetCode: string) {
    const server = this.server;
    const issuerKeypair = this.issuerKeypair;
    const networkPassphrase = this.networkPassphrase;

    await this.distributorCreationLock;
    let release: () => void;
    this.distributorCreationLock = new Promise<void>((res) => (release = res));

    const distributorAccount = await this.createAccount();

    release!();
    const asset = new Asset(assetCode, issuerKeypair.publicKey());

    const distributorAccountLoaded = await server.loadAccount(
      distributorAccount.accountAddress
    );

    return {
      issuerKeypair,
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    };
  }

  private async submitChangeTrustTx(
    server: Horizon.Server,
    distributorAccount: { privateKey: string },
    distributorAccountLoaded: Horizon.AccountResponse,
    asset: Asset,
    networkPassphrase: string
  ) {
    const trustTransaction = new TransactionBuilder(distributorAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    trustTransaction.sign(Keypair.fromSecret(distributorAccount.privateKey));
    const trustResponse = await server.submitTransaction(trustTransaction);

    return { trustTransaction, trustResponse };
  }

  async createNativeFT(): Promise<TransactionResult> {
    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext('TOKENCREATE');

    const { trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    return this.formatTransactionResult(trustResponse);
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext('TOKENTRUST');

    const { trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    return this.formatTransactionResult(trustResponse);
  }

  async mintNativeFT(): Promise<TransactionResult> {
    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
      issuerKeypair,
    } = await this.prepareStellarAssetContext('TOKENMINT');

    await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const issuerAccountLoaded = await server.loadAccount(
      issuerKeypair.publicKey()
    );

    const paymentTx = new TransactionBuilder(issuerAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributorAccount.accountAddress,
          asset,
          amount: '1000',
          source: issuerKeypair.publicKey(),
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    paymentTx.sign(issuerKeypair);
    const txResult = await server.submitTransaction(paymentTx);

    return this.formatTransactionResult(txResult);
  }

  async transferNativeFT(): Promise<TransactionResult> {
    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
      issuerKeypair,
    } = await this.prepareStellarAssetContext('TOKENTRANS');

    await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const issuerAccountLoaded = await server.loadAccount(
      issuerKeypair.publicKey()
    );

    const paymentTx = new TransactionBuilder(issuerAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributorAccount.accountAddress,
          asset,
          amount: '1000',
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    paymentTx.sign(issuerKeypair);
    const txResult = await server.submitTransaction(paymentTx);

    return this.formatTransactionResult(txResult);
  }

  async createNativeNFT(): Promise<TransactionResult> {
    const nftCode = `NFT${Math.floor(1000 + Math.random() * 9000)}`;

    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext(nftCode);

    const { trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    return this.formatTransactionResult(trustResponse);
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    const nftCode = `NFT${Math.floor(1000 + Math.random() * 9000)}`;

    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext(nftCode);

    const { trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    return this.formatTransactionResult(trustResponse);
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    const nftCode = `NFT${Math.floor(1000 + Math.random() * 9000)}`;

    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
      issuerKeypair,
    } = await this.prepareStellarAssetContext(nftCode);

    await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const issuerAccountLoaded = await server.loadAccount(
      issuerKeypair.publicKey()
    );

    const mintTx = new TransactionBuilder(issuerAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributorAccount.accountAddress,
          asset,
          amount: '1',
          source: issuerKeypair.publicKey(),
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    mintTx.sign(issuerKeypair);
    const mintResult = await server.submitTransaction(mintTx);

    return this.formatTransactionResult(mintResult);
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    const nftCode = `NFT${Math.floor(1000 + Math.random() * 9000)}`;

    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
      issuerKeypair,
    } = await this.prepareStellarAssetContext(nftCode);

    await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const issuerAccountLoaded = await server.loadAccount(
      issuerKeypair.publicKey()
    );

    const mintTx = new TransactionBuilder(issuerAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: distributorAccount.accountAddress,
          asset,
          amount: '1',
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    mintTx.sign(issuerKeypair);
    const mintResult = await server.submitTransaction(mintTx);

    return this.formatTransactionResult(mintResult);
  }

  public async submitMemoMessage(): Promise<TransactionResult> {
    const {
      issuerKeypair,
      networkPassphrase,
      server,
      distributorAccount,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext('MEMO');

    console.warn(
      '⚠️  Warning: Stellar supports memos up to 28 bytes. Longer data will be rejected.'
    );

    const memoTransaction = new TransactionBuilder(distributorAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addMemo(Memo.text(MEMO_TEXT_28_BYTES))
      .addOperation(
        Operation.payment({
          destination: issuerKeypair.publicKey(),
          asset: Asset.native(),
          amount: '1',
        })
      )
      .setTimeout(STELLAR_TX_TIMEOUT_SECONDS)
      .build();

    memoTransaction.sign(Keypair.fromSecret(distributorAccount.privateKey));

    const txResponse = await server.submitTransaction(memoTransaction);

    return this.formatTransactionResult(txResponse);
  }
}
