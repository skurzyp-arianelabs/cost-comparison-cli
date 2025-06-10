import { ChainConfig, TransactionResult } from '../types';
import { ConfigService } from "../services/ConfigService";
import { AbstractChainClient } from "./abstract/AbstractChainClient";

export class HederaChainClient extends AbstractChainClient {
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
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