import { ChainConfig, SupportedOperation, TransactionResult, WalletCredentials } from "../../types";
import { IChainClient } from "../IChainClient";
import { ConfigService } from "../../services/ConfigService";

export abstract class AbstractChainClient implements IChainClient {
  protected chainConfig: ChainConfig;
  protected credentials: WalletCredentials;
  protected configManager: ConfigService;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    this.chainConfig = chainConfig;
    this.configManager = configService;
    this.credentials = configService.getWalletCredentials(chainConfig.id);

    if (!this.credentials.privateKey) {
      throw new Error(
        `No wallet credentials found for ${chainConfig.name}. Please set WALLET_${chainConfig.id.toUpperCase()}_PRIVATE_KEY in your .env file`
      );
    }
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

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }

  async isHealthy(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async executeOperation(operation: SupportedOperation): Promise<TransactionResult> {
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
        default:
          throw new Error(`executeOperation: Operation '${operation}' is not implemented or supported.`);
      }
    } catch (error: any) {
      console.error(`Error during operation '${operation}': ${error.message || error}`);
      return {
        status: 'failed',
        error: error.message || error,
        timestamp: Date.now().toLocaleString(),
        operation,
        chain: this.chainConfig.type
      };
    }
  }
}
