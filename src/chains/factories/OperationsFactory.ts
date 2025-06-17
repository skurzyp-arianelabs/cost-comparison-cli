import { ConfigService } from "../../services/ConfigService/ConfigService";
import { SupportedChain } from "../../types";
import { SolanaChainClient } from "../SolanaChainClient";
import { HederaChainOperations } from '../Hedera/HederaChainOperations';
import { EvmOperations } from '../Hedera/evm-operations/EvmOperations';
import { HederaNativeSdkOperations } from '../Hedera/hashgraph-sdk-operations/HederaSdkOperations';
import { IChainOperations } from '../abstract/IChainOperations';

export class ChainOperationsFactory {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  createChainOperations(chainType: SupportedChain): IChainOperations {
    const config = this.configService.getChainConfig(chainType);
    if (!config) {
      throw new Error(`Unsupported chain: ${chainType}`);
    }

    switch (config.type) {
      case SupportedChain.HEDERA:
        const nativeHederaSdkOperations = new HederaNativeSdkOperations(this.configService);
        const evmOperations = new EvmOperations(this.configService);
        return new HederaChainOperations(nativeHederaSdkOperations, evmOperations);
      case SupportedChain.SOLANA:
        return new SolanaChainClient(config, this.configService);
      default:
        throw new Error(`No client implementation for chain type: ${config.name}`);
    }
  }
}