import { IChainOperations } from '../abstract/IChainOperations';
import {
  ChainConfig,
  FullTransactionResult,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { BigNumber } from 'bignumber.js';
import { CoinGeckoApiService } from '../../services/ApiService/CoinGeckoApiService';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { IStellarNativeOperations } from './IStellarNativeOperations';
import { StellarNativeOperations } from './StellarNativeOperations';

export class StellarChainOperations implements IChainOperations {
  private coinGeckoApiService: CoinGeckoApiService;
  private nativeSdkOps: IStellarNativeOperations;
  private chainConfig: ChainConfig;
  private stellarPriceInUsd: BigNumber | undefined;

  constructor(private configService: ConfigService) {
    this.chainConfig = this.configService.getChainConfig(
      SupportedChain.STELLAR
    );
    this.coinGeckoApiService = new CoinGeckoApiService(this.configService);
    this.nativeSdkOps = new StellarNativeOperations(configService);
    this.stellarPriceInUsd = undefined;
  }

  private async getStellarUsdPrice(): Promise<BigNumber> {
    if (this.stellarPriceInUsd) return this.stellarPriceInUsd;

    const stellarUSDPrice = (
      await this.coinGeckoApiService.getStellarPriceInUsd()
    )['stellar'].usd;
    this.stellarPriceInUsd = new BigNumber(stellarUSDPrice);
    return this.stellarPriceInUsd;
  }

  async generateFullResult(
    partialResult: TransactionResult,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    const stellarPriceInUsd = await this.getStellarUsdPrice();

    return {
      ...partialResult,
      chain: this.chainConfig.type,
      operation,
      usdCost: new BigNumber(partialResult.totalCost!)
        .multipliedBy(stellarPriceInUsd)
        .toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
    };
  }

  // native SDK operations
  async createNativeFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_NATIVE_FT
    );
  }

  async associateNativeFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.associateNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.ASSOCIATE_NATIVE_FT
    );
  }

  async mintNativeFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_NATIVE_FT
    );
  }

  async transferNativeFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_NATIVE_FT
    );
  }

  async createNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_NATIVE_NFT
    );
  }

  async associateNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.associateNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.ASSOCIATE_NATIVE_NFT
    );
  }

  async mintNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_NATIVE_NFT
    );
  }

  async transferNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_NATIVE_NFT
    );
  }

  async createERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_SDK
    );
  }

  async mintERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_SDK
    );
  }

  async transferERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_SDK
    );
  }

  async createERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_SDK
    );
  }

  async mintERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_SDK
    );
  }

  async transferERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_SDK
    );
  }

  async hcsSubmitMessage(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.submitMemoMessage();
    return await this.generateFullResult(
      result,
      SupportedOperation.HCS_MESSAGE_SUBMIT
    );
  }

  // Delegate EVM RPC operations
  async createERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_HARDHAT
    );
  }

  async mintERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_HARDHAT
    );
  }

  async transferERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_HARDHAT
    );
  }

  async createERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_HARDHAT
    );
  }

  async mintERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_HARDHAT
    );
  }

  async transferERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferNativeNFT();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_HARDHAT
    );
  }

  async isHealthy(): Promise<boolean> {
    return await this.nativeSdkOps.isHealthy();
  }

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }
}
