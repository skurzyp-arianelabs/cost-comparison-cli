import { ConfigService } from '../../services/ConfigService/ConfigService';
import {
  ChainConfig,
  FullTransactionResult,
  SupportedChain,
  SupportedOperation,
} from '../../types';
import { IChainOperations } from '../abstract/IChainOperations';
import { Client, SubmittableTransaction, TxResponse } from 'xrpl';
import { RippleNativeOperations } from './RippleNativeOperations';
import { CoinGeckoApiService } from '../../services/ApiService/CoinGeckoApiService';

export class RippleChainOperations implements IChainOperations {
  private readonly rippleNativeOperations: RippleNativeOperations;
  private readonly rippleClient: Client;
  private readonly rippleConfig: ChainConfig;
  private coinGeckoApiService: CoinGeckoApiService;
  private ripplePriceBN: number | undefined;

  constructor(private configService: ConfigService) {
    this.rippleConfig = this.configService.getChainConfig(
      SupportedChain.RIPPLE
    );
    this.rippleClient = new Client(this.rippleConfig.rpcUrls.default.http[0]!);
    this.rippleNativeOperations = new RippleNativeOperations(
      this.configService,
      this.rippleClient
    );
    this.coinGeckoApiService = new CoinGeckoApiService(this.configService);
  }

  private getErrorResponse(
    error: any,
    operation: SupportedOperation
  ): FullTransactionResult {
    return {
      chain: SupportedChain.RIPPLE,
      operation: operation,
      status: 'failed',
      timestamp: Date.now().toString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }

  private getNotApplicableResponse(
    operation: SupportedOperation
  ): FullTransactionResult {
    return {
      chain: SupportedChain.RIPPLE,
      operation: operation,
      status: 'not_applicable',
      timestamp: Date.now().toString(),
    };
  }

  private async getResponse(
    transactionResult: TxResponse<SubmittableTransaction>,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    return {
      chain: SupportedChain.RIPPLE,
      operation: operation,
      transactionHash: transactionResult.result.hash,
      status:
        (transactionResult.result.meta as any)?.TransactionResult ===
        'tesSUCCESS'
          ? 'success'
          : 'failed',
      timestamp: Date.now().toString(),
      nativeCurrencySymbol: 'XRP',
      usdCost: (
        await this.calculateTransactionCost(transactionResult)
      ).toString(),
    };
  }

  private async getResponseWithCost(
    transactionResult: TxResponse<SubmittableTransaction>,
    transactionCost: number,
    operation: SupportedOperation
  ): Promise<FullTransactionResult> {
    return {
      chain: SupportedChain.RIPPLE,
      operation: operation,
      transactionHash: transactionResult.result.hash,
      status:
        (transactionResult.result.meta as any)?.TransactionResult ===
        'tesSUCCESS'
          ? 'success'
          : 'failed',
      timestamp: Date.now().toString(),
      nativeCurrencySymbol: 'XRP',
      usdCost: transactionCost.toString(),
    };
  }

  private async getRippleUsdPrice(): Promise<number> {
    if (this.ripplePriceBN) return this.ripplePriceBN;
    this.ripplePriceBN = await this.coinGeckoApiService.getRipplePriceInUsd();
    return this.ripplePriceBN;
  }

  private async calculateTransactionCost(
    transactionResult: TxResponse<SubmittableTransaction>,
    transferAmount: number = 0
  ): Promise<number> {
    return (
      (parseInt(
        (transactionResult.result.tx_json.Fee || '0') + transferAmount
      ) /
        1_000_000) *
      (await this.getRippleUsdPrice())
    );
  }

  getChainInfo() {
    return this.rippleConfig;
  }

  async isHealthy(): Promise<boolean> {
    return await this.rippleNativeOperations.isHealthy();
  }

  async createNativeFT(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.CREATE_NATIVE_FT);
  }

  async associateNativeFT(): Promise<FullTransactionResult> {
    try {
      const response = await this.rippleNativeOperations.associateNativeFT();
      return await this.getResponse(
        response,
        SupportedOperation.ASSOCIATE_NATIVE_FT
      );
    } catch (error) {
      return this.getErrorResponse(
        error,
        SupportedOperation.ASSOCIATE_NATIVE_FT
      );
    }
  }

  async mintNativeFT(): Promise<FullTransactionResult> {
    try {
      const response = await this.rippleNativeOperations.mintNativeFT();
      return await this.getResponse(response, SupportedOperation.MINT_NATIVE_FT);
    } catch (error) {
      return this.getErrorResponse(error, SupportedOperation.MINT_NATIVE_FT);
    }
  }

  async transferNativeFT(): Promise<FullTransactionResult> {
    try {
      const response = await this.rippleNativeOperations.transferNativeFT();
      return await this.getResponse(
        response,
        SupportedOperation.TRANSFER_NATIVE_FT
      );
    } catch (error) {
      return this.getErrorResponse(
        error,
        SupportedOperation.TRANSFER_NATIVE_FT
      );
    }
  }

  async createERC20_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.CREATE_ERC20_SDK);
  }

  async mintERC20_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.MINT_ERC20_SDK);
  }

  async transferERC20_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.TRANSFER_ERC20_SDK);
  }

  async createERC20_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.CREATE_ERC20_HARDHAT
    );
  }

  async mintERC20_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.MINT_ERC20_HARDHAT);
  }

  async transferERC20_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.TRANSFER_ERC20_HARDHAT
    );
  }

  async createERC721_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.CREATE_ERC721_SDK);
  }

  async mintERC721_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.MINT_ERC721_SDK);
  }

  async transferERC721_SDK(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.TRANSFER_ERC721_SDK
    );
  }

  async createERC721_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.CREATE_ERC721_HARDHAT
    );
  }

  async mintERC721_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.MINT_ERC721_HARDHAT
    );
  }

  async transferERC721_RPC(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.TRANSFER_ERC721_HARDHAT
    );
  }

  async createNativeNFT(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(SupportedOperation.CREATE_NATIVE_NFT);
  }

  async associateNativeNFT(): Promise<FullTransactionResult> {
    return this.getNotApplicableResponse(
      SupportedOperation.ASSOCIATE_NATIVE_NFT
    );
  }

  async mintNativeNFT(): Promise<FullTransactionResult> {
    try {
      const response = await this.rippleNativeOperations.mintNativeNFT();
      return await this.getResponse(
        response,
        SupportedOperation.MINT_NATIVE_NFT
      );
    } catch (error) {
      return this.getErrorResponse(error, SupportedOperation.MINT_NATIVE_NFT);
    }
  }

  async transferNativeNFT(): Promise<FullTransactionResult> {
    try {
      await this.rippleNativeOperations.mintNativeNFT();
      const createOfferresponse =
        await this.rippleNativeOperations.createNFTCreateOffer();
      const transferresponse =
        await this.rippleNativeOperations.transferNativeNFT(
          (createOfferresponse.result.meta as any).offer_id
        );
      return await this.getResponseWithCost(
        transferresponse,
        (await this.calculateTransactionCost(createOfferresponse)) +
          (await this.calculateTransactionCost(transferresponse)),
        SupportedOperation.TRANSFER_NATIVE_NFT
      );
    } catch (error) {
      return this.getErrorResponse(
        error,
        SupportedOperation.TRANSFER_NATIVE_NFT
      );
    }
  }

  async hcsSubmitMessage(): Promise<FullTransactionResult> {
    try {
      const response = await this.rippleNativeOperations.hcsSubmitMessage();
      return await this.getResponse(
        response,
        SupportedOperation.HCS_MESSAGE_SUBMIT
      );
    } catch (error) {
      return this.getErrorResponse(
        error,
        SupportedOperation.HCS_MESSAGE_SUBMIT
      );
    }
  }
}
