import { AbstractChainClient } from './abstract/AbstractChainClient';
import { TransactionResult } from '../types';
import { ConfigService } from '../services/ConfigService/ConfigService';
import { Chain } from 'viem';

export class SolanaChainClient extends AbstractChainClient {
  constructor(chainConfig: Chain, configService: ConfigService) {
    super(chainConfig, configService);
    // create instance of wallet
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
}
