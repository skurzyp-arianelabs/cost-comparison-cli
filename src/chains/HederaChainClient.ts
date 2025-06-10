import { ChainConfig, TransactionResult } from '../types';
import { ConfigService } from "../services/ConfigService";
import { AbstractChainClient } from "./abstract/AbstractChainClient";

export class HederaChainClient extends AbstractChainClient {
  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
    this.initializeClient();
  }

  initializeClient() {
    // There will be hashgraph client initialization based on
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
}