import { BaseChainClient } from './BaseChainClient';
import { ChainConfig, TransactionResult } from '../types';
import { ConfigService } from '../services/ConfigService';

export class SolanaChainClient extends BaseChainClient {
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
    this.initializeClient();
  }

  initializeClient() {
    // There will be solana client initialization based on
    console.log(this.credentials);
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
}
