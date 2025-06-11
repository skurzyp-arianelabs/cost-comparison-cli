import { ConfigService } from '../../services/ConfigService';
import { ChainConfig, SupportedChain } from '../../types';
import { IChainClient } from '../IChainClient';
import { HederaChainClient } from '../HederaChainClient';
import { SolanaChainClient } from '../SolanaChainClient';

export class ChainClientFactory {
  private configService: ConfigService;
  private chainConfigs: Map<string, ChainConfig>;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.chainConfigs = new Map();
    this.initializeChainConfigs();
  }

  // TODO: this can probably be taken from viem/chains
  // TODO: support for mainnet/testnet switching to be added
  private initializeChainConfigs(): void {
    const configs: ChainConfig[] = [
      {
        id: 'hedera',
        name: 'Hedera',
        type: SupportedChain.HEDERA,
        nativeCurrency: 'HBAR',
        explorerUrl: 'https://hashscan.io',
      },
      {
        id: 'solana',
        name: 'Solana',
        type: SupportedChain.SOLANA,
        nativeCurrency: 'SOL',
        explorerUrl: 'https://solscan.io',
        rpcUrl: 'https://api.devnet.solana.com',
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
      case SupportedChain.HEDERA:
        return new HederaChainClient(config, this.configService);
      case SupportedChain.SOLANA:
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
