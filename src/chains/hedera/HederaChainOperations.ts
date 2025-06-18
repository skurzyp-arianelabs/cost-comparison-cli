import { IChainOperations } from '../abstract/IChainOperations';
import { INativeHederaSdkOperations } from './IHederaNativeOperations';
import { IEvmRpcOperations } from '../evm/IEvmRpcOperations';
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
import { HederaNativeOperations } from './HederaNativeOperations';
import { EvmRpcOperations } from '../evm/EvmRpcOperations';
import { parseDerKeyToHex } from './hederaUtils';

export class HederaChainOperations implements IChainOperations {
  private coinGeckoApiService: CoinGeckoApiService;
  private nativeSdkOps: INativeHederaSdkOperations;
  private chainConfig: ChainConfig;
  private evmRpcOps: IEvmRpcOperations;

  constructor(private configService: ConfigService) {
    this.chainConfig = this.configService.getChainConfig(SupportedChain.HEDERA);
    const privateKey = this.configService.getWalletCredentials(
      this.chainConfig.type
    ).privateKey!;
    const hexPrivateKey = parseDerKeyToHex(privateKey);

    this.coinGeckoApiService = new CoinGeckoApiService();
    this.evmRpcOps = new EvmRpcOperations(
      this.chainConfig.rpcUrls.default.http[0]!,
      hexPrivateKey
    );
    this.nativeSdkOps = new HederaNativeOperations(configService);
  }

  private async getHbarUsdPrice(): Promise<BigNumber> {
    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    return new BigNumber(hbarUSDPrice);
  }

  async generateFullResult(
    partialResult: TransactionResult,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    const hbarPriceBN = await this.getHbarUsdPrice();

    return {
      ...partialResult,
      chain: this.chainConfig.type,
      operation,
      usdCost: new BigNumber(partialResult.totalCost!)
        .multipliedBy(hbarPriceBN)
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
    const result = await this.nativeSdkOps.createERC20_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_SDK
    );
  }

  async mintERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintERC20_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_SDK
    );
  }

  async transferERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferERC20_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_SDK
    );
  }

  async createERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.createERC721_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_SDK
    );
  }

  async mintERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.mintERC721_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_SDK
    );
  }

  async transferERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.transferERC721_SDK();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_SDK
    );
  }

  async hcsSubmitMessage(): Promise<FullTransactionResult> {
    const result = await this.nativeSdkOps.hcsSubmitMessage();
    return await this.generateFullResult(
      result,
      SupportedOperation.HCS_MESSAGE_SUBMIT
    );
  }

  // Delegate EVM RPC operations
  async createERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_HARDHAT
    );
  }

  async mintERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_HARDHAT
    );
  }

  async transferERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_HARDHAT
    );
  }

  async createERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_HARDHAT
    );
  }

  async mintERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_HARDHAT
    );
  }

  async transferERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_HARDHAT
    );
  }

  // utils
  async isHealthy(): Promise<boolean> {
    const evmHealthy = await this.evmRpcOps.isHealthy();
    const nativeHealthy = await this.nativeSdkOps.isHealthy();
    return evmHealthy && nativeHealthy;
  }

  getChainInfo(): ChainConfig {
    throw new Error('Method not implemented.');
  }
}
