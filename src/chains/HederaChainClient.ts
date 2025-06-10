import { ChainConfig, TransactionResult } from '../types';
import { BaseChainClient } from './BaseChainClient';
import { ConfigService } from '../services/ConfigService';

export class HederaChainClient extends BaseChainClient {
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
    this.initializeClient();
  }

  initializeClient() {
    // There will be hashgraph client initialization based on
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
