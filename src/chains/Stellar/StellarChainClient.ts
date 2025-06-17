import {
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
  Keypair,
  Horizon,
  Memo,
} from 'stellar-sdk';
import BigNumber from 'bignumber.js';
import { AbstractChainClient } from '../abstract/AbstractChainClient';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import {
  ExtendedChain,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { StellarWalletService } from '../../services/WalletServices/StellarWalletService';
import { calculateUsdCost } from '../../utils/calculateUsdCost';
import { MEMO_TEXT_28_BYTES } from '../../utils/constants';
import { STELLAR_TX_TIMEOUT_SECONDS } from './constants';

export class StellarChainClient extends AbstractChainClient {
  private stellarPriceUSD!: BigNumber;
  private distributorCreationLock: Promise<void> = Promise.resolve();

  constructor(chainConfig: ExtendedChain, configService: ConfigService) {
    const walletService = new StellarWalletService(configService);

    super(chainConfig, configService, walletService);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const server = (this.walletService as StellarWalletService).getClient();
      const feeStats = await server.feeStats();

      return typeof feeStats?.last_ledger_base_fee !== 'undefined';
    } catch (error) {
      console.error('Stellar Health check failed:', error);
      return false;
    }
  }

  private async fetchStellarPrice(): Promise<void> {
    if (!this.stellarPriceUSD) {
      const price = await this.coinGeckoApiService.getStellarPriceInUsd();
      this.stellarPriceUSD = new BigNumber(price.stellar.usd);
    }
  }

  private async getFeeAndUsdCost(
    fee: number
  ): Promise<{ fee: number; usdCost: string }> {
    await this.fetchStellarPrice();
    const usdCost = calculateUsdCost(
      fee,
      this.stellarPriceUSD!,
      this.chainConfig.nativeCurrency.decimals
    );
    return { fee, usdCost };
  }

  private async prepareStellarAssetContext(assetCode: string) {
    const walletService = this.walletService as StellarWalletService;
    const issuerKeypair = walletService.getIssuerKeypair();
    const networkPassphrase = walletService.getNetworkPassphrase();
    const server = walletService.getClient();

    await this.distributorCreationLock;
    let release: () => void;
    this.distributorCreationLock = new Promise<void>((res) => (release = res));

    const distributorAccount = await walletService.createAccount();

    release!();
    const asset = new Asset(assetCode, issuerKeypair.publicKey());

    const distributorAccountLoaded = await server.loadAccount(
      distributorAccount.accountAddress
    );

    return {
      walletService,
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

    const txDetails = await server
      .transactions()
      .transaction(trustResponse.hash as string)
      .call();

    const feeCreateToken = parseInt(txDetails.fee_charged as string);
    const { fee, usdCost } = await this.getFeeAndUsdCost(feeCreateToken);

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: txDetails.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const {
      networkPassphrase,
      server,
      distributorAccount,
      asset,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext('TOKENTRUST');

    const { trustTransaction, trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const { fee, usdCost } = await this.getFeeAndUsdCost(
      Number(trustTransaction.fee)
    );

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: trustResponse.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const { fee, usdCost } = await this.getFeeAndUsdCost(Number(paymentTx.fee));

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.MINT_NATIVE_FT,
      transactionHash: txResult.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const { fee, usdCost } = await this.getFeeAndUsdCost(Number(paymentTx.fee));

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.TRANSFER_NATIVE_FT,
      transactionHash: txResult.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const txDetails = await server
      .transactions()
      .transaction(trustResponse.hash as string)
      .call();
    const fee = parseInt(txDetails.fee_charged as string);
    const { usdCost } = await this.getFeeAndUsdCost(fee);

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.CREATE_NATIVE_NFT,
      transactionHash: txDetails.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const { trustTransaction, trustResponse } = await this.submitChangeTrustTx(
      server,
      distributorAccount,
      distributorAccountLoaded,
      asset,
      networkPassphrase
    );

    const { fee, usdCost } = await this.getFeeAndUsdCost(
      Number(trustTransaction.fee)
    );

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.ASSOCIATE_NATIVE_NFT,
      transactionHash: trustResponse.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const { fee, usdCost } = await this.getFeeAndUsdCost(Number(mintTx.fee));

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.MINT_NATIVE_NFT,
      transactionHash: mintResult.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
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

    const { fee, usdCost } = await this.getFeeAndUsdCost(Number(mintTx.fee));

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.TRANSFER_NATIVE_NFT,
      transactionHash: mintResult.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  public async hcsSubmitMessage(): Promise<TransactionResult> {
    const {
      issuerKeypair,
      networkPassphrase,
      server,
      distributorAccount,
      distributorAccountLoaded,
    } = await this.prepareStellarAssetContext('MEMO');

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
    const { fee, usdCost } = await this.getFeeAndUsdCost(
      Number(memoTransaction.fee)
    );

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.HCS_MESSAGE_SUBMIT,
      transactionHash: txResponse.hash,
      gasUsed: fee.toString(),
      totalCost: (
        fee /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }
}
