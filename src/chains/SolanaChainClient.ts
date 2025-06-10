import { AbstractChainClient } from "./abstract/AbstractChainClient";
import { ChainConfig, TransactionResult } from "../types";
import { ConfigService } from "../services/ConfigService";

export class SolanaChainClient extends AbstractChainClient {
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