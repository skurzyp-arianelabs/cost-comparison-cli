import { AbstractChainClient } from "./abstract/AbstractChainClient";
import { ChainConfig, SupportedOperation, TransactionResult } from "../types";
import { ConfigService } from "../services/ConfigService";

export class SolanaChainClient extends AbstractChainClient {
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
    this.initializeClient();
  }

  initializeClient() {
    // There will be solana client initialization based on
    console.log(this.credentials);
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

  async executeOperation(operation: SupportedOperation): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
}