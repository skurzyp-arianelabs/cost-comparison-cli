import { ChainConfig, TransactionResult, WalletCredentials } from '../types';
import { ConfigService } from '../services/ConfigService';
import { IChainClient } from './IChainClient';

export abstract class BaseChainClient implements IChainClient {
  protected chainConfig: ChainConfig;
  protected credentials: WalletCredentials;
  protected configManager: ConfigService; // should be a singleton created in the app startpoint

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

  createNativeFT(): TransactionResult {
    throw new Error('Method not implemented.');
  }
  createNativeNFT(): TransactionResult {
    throw new Error('Method not implemented.');
  }
  createERC20(): TransactionResult {
    throw new Error('Method not implemented.');
  }
  createERC721(): TransactionResult {
    throw new Error('Method not implemented.');
  }

  getChainInfo(): ChainConfig {
    return this.chainConfig;
  }
}
