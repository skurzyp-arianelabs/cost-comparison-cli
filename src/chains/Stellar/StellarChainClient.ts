import { Horizon } from 'stellar-sdk';
import { AbstractChainClient } from '../abstract/AbstractChainClient';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { ExtendedChain, TransactionResult } from '../../types';
import { StellarWalletService } from '../../services/WalletServices/StellarWalletService';

export class StellarChainClient extends AbstractChainClient {
  constructor(chainConfig: ExtendedChain, configService: ConfigService) {
    const walletService = new StellarWalletService(configService);

    super(chainConfig, configService, walletService);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const server = (this.walletService as StellarWalletService).getClient();
      const feeStats = await server.feeStats();

      return typeof feeStats?.last_ledger_base_fee !== 'undefined';
    } catch (error) {
      console.error('Stellar Health check failed:', error);
      return false;
    }
  }

  async createNativeFT(): Promise<TransactionResult> {
    throw new Error('Method not implemented. zzz');
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

  async hcsSubmitMessage(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
}
