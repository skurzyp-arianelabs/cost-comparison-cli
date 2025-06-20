import { IChainOperations } from '../abstract/IChainOperations';
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
import { EvmRpcOperations } from '../evm/EvmRpcOperations';
import { formatUnits } from 'viem';

export class OptimismChainOperations implements IChainOperations {
  private coinGeckoApiService: CoinGeckoApiService;
  private chainConfig: ChainConfig;
  private evmRpcOps: IEvmRpcOperations;
  private ethPriceBN: BigNumber | undefined;

  constructor(private configService: ConfigService) {
    this.chainConfig = this.configService.getChainConfig(
      SupportedChain.OPTIMISM
    );
    const privateKey = this.configService.getWalletCredentials(
      this.chainConfig.type
    ).privateKey!;

    this.coinGeckoApiService = new CoinGeckoApiService(this.configService);
    this.evmRpcOps = new EvmRpcOperations(
      this.chainConfig.rpcUrls.default.http[0]!,
      privateKey as `0x${string}`
    );
    this.ethPriceBN = undefined;
  }

  private async getEthUsdPrice(): Promise<BigNumber> {
    if (this.ethPriceBN) return this.ethPriceBN;

    const ethUSDPrice = await this.coinGeckoApiService.getEthPriceInUsd();
    this.ethPriceBN = new BigNumber(ethUSDPrice);
    return this.ethPriceBN;
  }

  async generateFullResult(
    partialResult: TransactionResult,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    const ethPriceBN = await this.getEthUsdPrice();

    const gasUsed = new BigNumber(partialResult.gasUsed ?? 0);
    const gasPrice = new BigNumber(partialResult.gasPrice ?? 0);
    const additionalCost = new BigNumber(partialResult.additionalCost ?? 0);
    const feeL1 = new BigNumber(partialResult.feeL1 ?? 0);


    const totalCostWei = gasUsed
      .multipliedBy(gasPrice)
      .plus(feeL1)
      .plus(additionalCost);

    const totalCostEth = new BigNumber(
      formatUnits(
        BigInt(totalCostWei.toFixed(0)),
        this.chainConfig.nativeCurrency.decimals
      )
    );

    const usdCostBN = totalCostEth.multipliedBy(ethPriceBN);

    return {
      ...partialResult,
      chain: this.chainConfig.type,
      operation,
      totalCost: totalCostEth.toString(),
      usdCost: usdCostBN.multipliedBy(ethPriceBN).toString(),
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
    throw new Error('associateNativeFT() not supported for Optimism');
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
    throw new Error('associateNativeNFT() not supported for Optimism');
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

  async hcsSubmitMessage(): Promise<FullTransactionResult> {
    const result = await this.evmRpcOps.submitMessage();
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
    return await this.evmRpcOps.isHealthy();
  }

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }
}
