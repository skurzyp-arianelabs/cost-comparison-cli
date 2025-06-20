import { IChainOperations } from '../abstract/IChainOperations';
import {
  ChainConfig,
  FullTransactionResult,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { CoinGeckoApiService } from '../../services/ApiService/CoinGeckoApiService';
import { EvmRpcOperations } from '../evm/EvmRpcOperations';
import { IEvmRpcOperations } from '../evm/IEvmRpcOperations';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'viem';

export class AvalancheChainOperations implements IChainOperations {
  private coinGeckoApiService: CoinGeckoApiService;
  private chainConfig: ChainConfig;
  private evmRpcOps: IEvmRpcOperations;
  private avaxPriceInUsd: BigNumber | undefined;

  constructor(private configService: ConfigService) {
    this.chainConfig = this.configService.getChainConfig(
      SupportedChain.AVALANCHE
    );
    const privateKey = this.configService.getWalletCredentials(
      this.chainConfig.type
    ).privateKey!;

    this.coinGeckoApiService = new CoinGeckoApiService(this.configService);
    this.evmRpcOps = new EvmRpcOperations(
      this.chainConfig.rpcUrls.default.http[0]!,
      privateKey as `0x${string}`
    );
  }

  private async getAvaxUsdPrice(): Promise<BigNumber> {
    if (this.avaxPriceInUsd) return this.avaxPriceInUsd;

    const avaxUSDPrice = await this.coinGeckoApiService.getAvaxPriceInUsd();
    this.avaxPriceInUsd = new BigNumber(avaxUSDPrice);
    return this.avaxPriceInUsd;
  }

  async generateFullResult(
    partialResult: TransactionResult,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    const avaxPriceBN = await this.getAvaxUsdPrice();

    const gasUsed = new BigNumber(partialResult.gasUsed ?? 0);
    const gasPrice = new BigNumber(partialResult.gasPrice ?? 0);
    const additionalCost = new BigNumber(partialResult.additionalCost ?? 0);

    const totalCostWei = gasUsed
      .multipliedBy(gasPrice)
      .plus(additionalCost);

    const totalCostAvax = new BigNumber(
      formatUnits(
        BigInt(totalCostWei.toFixed(0)),
        this.chainConfig.nativeCurrency.decimals
      )
    );

    const usdCostBN = totalCostAvax.multipliedBy(avaxPriceBN);

    return {
      ...partialResult,
      chain: this.chainConfig.type,
      operation,
      totalCost: totalCostAvax.toString(),
      usdCost: usdCostBN.toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
    };
  }

  // native SDK operations
  async createNativeFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_NATIVE_FT
    );
  }

  async associateNativeFT(): Promise<FullTransactionResult> {
    throw new Error(
      'Method associateNativeFT() is not supported for Avalanche.'
    );
  }

  async mintNativeFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_NATIVE_FT
    );
  }

  async transferNativeFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_NATIVE_FT
    );
  }

  async createNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_NATIVE_NFT
    );
  }

  async associateNativeNFT(): Promise<FullTransactionResult> {
    throw new Error(
      'Method associateNativeNFT() is not supported for Avalanche.'
    );
  }

  async mintNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_NATIVE_NFT
    );
  }

  async transferNativeNFT(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_NATIVE_NFT
    );
  }

  async createERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_SDK
    );
  }

  async mintERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_SDK
    );
  }

  async transferERC20_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_SDK
    );
  }

  async createERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_SDK
    );
  }

  async mintERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_SDK
    );
  }

  async transferERC721_SDK(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_SDK
    );
  }

  async submitMessage(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.submitMessage();
    return await this.generateFullResult(
      result,
      SupportedOperation.SUBMIT_MESSAGE
    );
  }

  // Delegate EVM RPC operations
  async createERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC20_JSON_RPC
    );
  }

  async mintERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC20_JSON_RPC
    );
  }

  async transferERC20_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC20_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC20_JSON_RPC
    );
  }

  async createERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.createERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.CREATE_ERC721_JSON_RPC
    );
  }

  async mintERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.mintERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.MINT_ERC721_JSON_RPC
    );
  }

  async transferERC721_RPC(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.transferERC721_RPC();
    return await this.generateFullResult(
      result,
      SupportedOperation.TRANSFER_ERC721_JSON_RPC
    );
  }

  // utils
  async isHealthy(): Promise<boolean> {
    return await this.evmRpcOps.isHealthy();
  }

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }
}
