import {
  ChainConfig,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { IChainClient } from '../IChainClient';
import { ConfigService } from '../../services/ConfigService';
import { CoinGeckoApiService } from '../../services/ApiService/CoinGeckoApiService';
import { AbstractWalletService } from '../../services/WalletServices/AbstractWalletService';

export abstract class AbstractChainClient implements IChainClient {
  protected chainConfig: ChainConfig;
  protected configManager: ConfigService;
  protected coinGeckoApiService: CoinGeckoApiService;
  protected walletService: AbstractWalletService;

  constructor(
    chainConfig: ChainConfig,
    configService: ConfigService,
    walletService: AbstractWalletService
  ) {
    this.chainConfig = chainConfig;
    this.configManager = configService;
    this.coinGeckoApiService = new CoinGeckoApiService();
    this.walletService = walletService;
  }

  // Native Fungible Token Operations
  async createNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async associateNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async transferNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async createERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async transferERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async createERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async transferERC20_RPC(): Promise<TransactionResult> {
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

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }

  async isHealthy(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async executeOperation(
    operation: SupportedOperation
  ): Promise<TransactionResult> {
    try {
      switch (operation) {
        case SupportedOperation.CREATE_NATIVE_FT:
          return await this.createNativeFT();
        case SupportedOperation.ASSOCIATE_NATIVE_FT:
          return await this.associateNativeFT();
        case SupportedOperation.MINT_NATIVE_FT:
          return await this.mintNativeFT();
        case SupportedOperation.TRANSFER_NATIVE_FT:
          return await this.transferNativeFT();
        case SupportedOperation.CREATE_ERC20_SDK:
          return await this.createERC20_SDK();
        case SupportedOperation.MINT_ERC20_SDK:
          return await this.mintERC20_SDK();
        case SupportedOperation.TRANSFER_ERC20_SDK:
          return await this.transferERC20_SDK();
        case SupportedOperation.CREATE_ERC20_HARDHAT:
          return await this.createERC20_RPC();
        case SupportedOperation.MINT_ERC20_HARDHAT:
          return await this.mintERC20_RPC();
        case SupportedOperation.TRANSFER_ERC20_HARDHAT:
          return await this.transferERC20_RPC();
        case SupportedOperation.CREATE_NATIVE_NFT:
          return await this.createNativeNFT();
        case SupportedOperation.ASSOCIATE_NATIVE_NFT:
          return await this.associateNativeNFT();
        case SupportedOperation.MINT_NATIVE_NFT:
          return await this.mintNativeNFT();
        case SupportedOperation.TRANSFER_NATIVE_NFT:
          return await this.transferNativeNFT();
        default:
          throw new Error(
            `executeOperation: Operation '${operation}' is not implemented or supported.`
          );
      }
    } catch (error: any) {
      console.error(
        `Error during operation '${operation}': ${error.message || error}`
      );
      return {
        status: 'failed',
        error: error.message || error,
        timestamp: Date.now().toLocaleString(),
        operation,
        chain: this.chainConfig.type,
      };
    }
  }
}
