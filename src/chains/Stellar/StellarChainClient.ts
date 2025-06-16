import {
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
  Keypair,
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

export class StellarChainClient extends AbstractChainClient {
  private stellarPriceUSD!: BigNumber;

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

  public async createNativeFT(): Promise<TransactionResult> {
    const walletService = this.walletService as StellarWalletService;
    const issuerKeypair = walletService.getIssuerKeypair();
    const networkPassphrase = walletService.getNetworkPassphrase();
    const server = walletService.getClient();

    const distributorAccount = await walletService.createAccount();

    const asset = new Asset('MYTOKEN', issuerKeypair.publicKey());

    const distributorAccountLoaded = await server.loadAccount(
      distributorAccount.accountAddress
    );
    const trustTx = new TransactionBuilder(distributorAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
        })
      )
      .setTimeout(30)
      .build();

    trustTx.sign(Keypair.fromSecret(distributorAccount.privateKey));
    const trustResult = await server.submitTransaction(trustTx);

    const txDetails = await server
      .transactions()
      .transaction(trustResult.hash as string)
      .call();

    const feeCreateToken = parseInt(txDetails.fee_charged as string);
    const { fee, usdCost } = await this.getFeeAndUsdCost(feeCreateToken);

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: txDetails.hash,
      gasUsed: fee.toString(),
      totalCost: (
        Number(feeCreateToken) /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const walletService = this.walletService as StellarWalletService;
    const issuerKeypair = walletService.getIssuerKeypair();
    const networkPassphrase = walletService.getNetworkPassphrase();
    const server = walletService.getClient();

    const distributorAccount = await walletService.createAccount();

    const asset = new Asset('MYTOKEN', issuerKeypair.publicKey());

    const distributorAccountLoaded = await server.loadAccount(
      distributorAccount.accountAddress
    );

    const trustTx = new TransactionBuilder(distributorAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
        })
      )
      .setTimeout(30)
      .build();

    trustTx.sign(Keypair.fromSecret(distributorAccount.privateKey));
    const txResult = await server.submitTransaction(trustTx);

    const { fee, usdCost } = await this.getFeeAndUsdCost(Number(trustTx.fee));

    return {
      chain: SupportedChain.STELLAR,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: txResult.hash,
      gasUsed: fee.toString(),
      totalCost: (
        Number(trustTx.fee) /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  async mintNativeFT(): Promise<TransactionResult> {
    const walletService = this.walletService as StellarWalletService;
    const issuerKeypair = walletService.getIssuerKeypair();
    const networkPassphrase = walletService.getNetworkPassphrase();
    const server = walletService.getClient();

    const distributorAccount = await walletService.createAccount();

    const asset = new Asset('MYTOKEN', issuerKeypair.publicKey());

    const distributorAccountLoaded = await server.loadAccount(
      distributorAccount.accountAddress
    );

    const trustTx = new TransactionBuilder(distributorAccountLoaded, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
        })
      )
      .setTimeout(30)
      .build();

    trustTx.sign(Keypair.fromSecret(distributorAccount.privateKey));
    await server.submitTransaction(trustTx);

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
      .setTimeout(30)
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
        Number(paymentTx.fee) /
        10 ** this.chainConfig.nativeCurrency.decimals
      ).toString(),
      usdCost,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  async transferNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async createNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async hcsSubmitMessage(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
}
