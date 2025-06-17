import { INativeHederaSdkOperations } from './INativeHederaSdkOperations';
import {
  ExtendedChain,
  SupportedChain, SupportedOperation,
  TransactionResult,
} from '../../../types';
import { ConfigService } from '../../../services/ConfigService/ConfigService';
import { HederaNativeWalletService } from '../../../services/WalletServices/HederaNativeWalletService';
import { BigNumber } from 'bignumber.js';
import { Status, TransactionReceipt, TransactionRecord, TransactionResponse } from '@hashgraph/sdk';
import { CoinGeckoApiService } from '../../../services/ApiService/CoinGeckoApiService';

export class HederaNativeSdkOperations implements INativeHederaSdkOperations {
  private configService: ConfigService;
  private hederaNativeWalletService: HederaNativeWalletService;
  private coinGeckoApiService: CoinGeckoApiService;
  private chainConfig: ExtendedChain;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.hederaNativeWalletService = new HederaNativeWalletService(configService);
    this.coinGeckoApiService = new CoinGeckoApiService();
    this.chainConfig = this.configService.getChainConfig(SupportedChain.HEDERA);
  }

  private async getHbarUsdPrice(): Promise<BigNumber> {
    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;
    return new BigNumber(hbarUSDPrice);
  }

  private async createTransactionResult(
    operation: SupportedOperation,
    txResponse: TransactionResponse,
    txRecord: TransactionRecord,
    txReceipt: TransactionReceipt
  ): Promise<TransactionResult> {
    const hbarPriceBN = await this.getHbarUsdPrice();
    return {
      chain: this.chainConfig.type,
      operation,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed:
        txRecord.contractFunctionResult?.gasUsed.toString() ||
        txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  async createNativeFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } = await this.hederaNativeWalletService.createNativeFT();
    return this.createTransactionResult(
      SupportedOperation.CREATE_NATIVE_FT,
      txResponse,
      txRecord,
      txReceipt,
    )
  }

  async associateNativeFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } = await this.hederaNativeWalletService.associateNativeFT();
    return this.createTransactionResult(
      SupportedOperation.CREATE_NATIVE_FT,
      txResponse,
      txRecord,
      txReceipt,
    )
  }


  createNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  associateNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  createERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  createERC721_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  hcsSubmitMessage(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  mintERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  mintERC721_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  mintNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  mintNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  transferERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  transferERC721_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  transferNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  transferNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');

  }

  getChainInfo(): ExtendedChain {
    return this.configService.getChainConfig(SupportedChain.HEDERA);
  }
}