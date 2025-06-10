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

  async createNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async createNativeNFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async deployERC20(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async deployERC721(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }

  async isHealthy(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async executeOperation(operation: SupportedOperation): Promise<TransactionResult> {
    switch (operation) {
      case SupportedOperation.DEPLOY_ERC20:
        try {
          return await this.deployERC20();
        } catch (error: any) {
          console.error(`Error deploying ERC20: ${error.message || error}`);
          return {
            status: 'failed',
            error: error.message || error,
            timestamp: Date.now().toLocaleString(),
            operation,
            chain: this.chainConfig.name
          };
        }
      case SupportedOperation.DEPLOY_ERC721:
        try {
          return await this.deployERC721();
        } catch (error: any) {
          console.error(`Error deploying ERC721: ${error.message || error}`);
          return {
            status: 'failed',
            error: error.message || error,
            timestamp: Date.now().toLocaleString(),
            operation,
            chain: this.chainConfig.name
          };
        }
      default:
        // Handle unsupported operations
        const errorMessage = `executeOperation: Operation '${operation}' is not implemented or supported.`;
        console.error(errorMessage);
        return {
          status: 'failed',
          error: errorMessage,
          timestamp: Date.now().toLocaleString(),
          operation,
          chain: this.chainConfig.name
        };
    }
  }
}
