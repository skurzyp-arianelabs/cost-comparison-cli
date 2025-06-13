import { ConfigService } from '../../services/ConfigService/ConfigService';
import { SupportedChain } from '../../types';
import { IChainClient } from '../IChainClient';
import { HederaChainClient } from '../Hedera/HederaChainClient';
import { SolanaChainClient } from '../Solana/SolanaChainClient';

export class ChainClientFactory {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  createClient(chainType: SupportedChain): IChainClient {
    const config = this.configService.getChainConfig(chainType);
    if (!config) {
      throw new Error(`Unsupported chain: ${chainType}`);
    }

    switch (config.type) {
      case SupportedChain.HEDERA:
        return new HederaChainClient(config, this.configService);
      case SupportedChain.SOLANA:
        return new SolanaChainClient(config, this.configService);
      default:
        throw new Error(
          `No client implementation for chain type: ${config.name}`
        );
    }
  }
}
