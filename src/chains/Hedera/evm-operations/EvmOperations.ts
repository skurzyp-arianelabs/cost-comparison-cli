import { IEvmRpcOperations } from './IEvmRpcOperations';
import {
  ExtendedChain,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../../types';
import { ConfigService } from '../../../services/ConfigService/ConfigService';
import { CoinGeckoApiService } from '../../../services/ApiService/CoinGeckoApiService';
import { HederaEvmWalletService } from '../../../services/WalletServices/HederaEvmWalletService';
import {
  formatUnits,
  TransactionReceipt as ViemTransactionReceipt,
} from 'viem';
import { BigNumber } from 'bignumber.js';

export class EvmOperations implements IEvmRpcOperations {
  private configService: ConfigService;
  private hederaEvmWalletService: HederaEvmWalletService;
  private coinGeckoApiService: CoinGeckoApiService;
  private chainConfig: ExtendedChain;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.hederaEvmWalletService = new HederaEvmWalletService(configService);
    this.coinGeckoApiService = new CoinGeckoApiService();
    this.chainConfig = this.configService.getChainConfig(SupportedChain.HEDERA);
  }

  private async getHbarUsdPrice(): Promise<BigNumber> {
    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    return new BigNumber(hbarUSDPrice);
  }

  private async createViemTransactionResult(
    operation: SupportedOperation,
    txHash: string,
    receipt: ViemTransactionReceipt
  ): Promise<TransactionResult> {
    const hbarPriceBN = await this.getHbarUsdPrice();
    const totalCostTinybar = receipt.gasUsed * receipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);
    const usdCost = BigNumber(totalCostHbar)
      .multipliedBy(hbarPriceBN)
      .toString();

    return {
      chain: this.chainConfig.type,
      operation,
      transactionHash: txHash,
      gasUsed: receipt.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
    };
  }

  async createERC20_RPC(): Promise<TransactionResult> {
    const { txHash, receipt } =
      await this.hederaEvmWalletService.createERC20_RPC();
    return this.createViemTransactionResult(
      SupportedOperation.CREATE_ERC20_HARDHAT,
      txHash,
      receipt
    );
  }

  async mintERC20_RPC(): Promise<TransactionResult> {
    const { txHash, receipt } =
      await this.hederaEvmWalletService.mintERC20_RPC();
    return this.createViemTransactionResult(
      SupportedOperation.CREATE_ERC20_HARDHAT,
      txHash,
      receipt
    );
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  createERC721_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  mintERC721_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  transferERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  transferERC721_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
}
