import { ChainConfig } from '../types';
import { ConfigService } from '../services/ConfigService';
import { IChainClient } from './IChainClient';
import { HederaChainClient } from './HederaChainClient';
import { SolanaChainClient } from './SolanaChainClient';

export class ChainClientFactory {
  private configService: ConfigService;
  private chainConfigs: Map<string, ChainConfig>;

  constructor(configService: ConfigService) {
    this.configService = configService; // singleton created in the entry point of the app
    this.chainConfigs = new Map();
    this.initializeChainConfigs();
  }

  private initializeChainConfigs(): void {
    const configs: ChainConfig[] = [
      {
        id: 'hedera',
        name: 'Hedera',
        type: 'hedera',
        nativeCurrency: 'HBAR',
        explorerUrl: 'https://hashscan.io',
      },
      {
        id: 'solana',
        name: 'Solana',
        type: 'solana',
        nativeCurrency: 'SOL',
        explorerUrl: 'https://solscan.io',
      },
    ];

    configs.forEach((config) => {
      this.chainConfigs.set(config.id, config);
    });
  }

  createClient(chainId: string): IChainClient {
    const config = this.chainConfigs.get(chainId);
    if (!config) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    switch (config.type) {
      case 'hedera':
        return new HederaChainClient(config, this.configService);
      case 'solana':
        return new SolanaChainClient(config, this.configService);
      default:
        throw new Error(
          `No client implementation for chain type: ${config.type}`
        );
    }
  }

  getSupportedChains(): ChainConfig[] {
    return Array.from(this.chainConfigs.values());
  }
}
