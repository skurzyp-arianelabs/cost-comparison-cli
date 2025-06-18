import { ConfigService } from '../../services/ConfigService/ConfigService';
import { SupportedChain } from '../../types';
import { HederaChainOperations } from '../hedera/HederaChainOperations';
import { IChainOperations } from '../abstract/IChainOperations';
import { AvalancheChainOperations } from '../avalanche/AvalancheChainOperations';
import { SolanaChainOperations } from '../solana/SolanaChainOperations';

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
        return new HederaChainOperations(this.configService);
      case SupportedChain.AVALANCHE:
        return new AvalancheChainOperations(this.configService);
      case SupportedChain.SOLANA:
        return new SolanaChainOperations(this.configService);
      default:
        throw new Error(
          `No client implementation for chain type: ${config.name}`
        );
    }
  }
}
