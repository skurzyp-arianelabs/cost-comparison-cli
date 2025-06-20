import {
  ChainConfig,
  NetworkType,
  RippleWalletCredentials,
  SupportedChain,
  WalletCredentials,
} from '../../types';
import dotenv from 'dotenv';
import { initSupportedChains } from './ChainsConfig';

dotenv.config();

export class ConfigService {
  private config: Map<string, any> = new Map();
  private chainsConfigs: ChainConfig[];
  private networkType: NetworkType;
  private coinGeckoApiKey: string | undefined;

  constructor(networkType: NetworkType) {
    this.loadFromEnv();
    this.chainsConfigs = initSupportedChains();
    this.networkType = networkType;
  }

  public getChainConfig(chainType: SupportedChain): ChainConfig {
    return this.chainsConfigs.find(
      (c) => c.type === chainType && c.network === this.networkType
    )!;
  }

  private loadFromEnv(): void {
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('WALLET_')) {
        this.config.set(key, process.env[key]);
      }
    });
  }

  public getWalletCredentials(chain: SupportedChain): WalletCredentials {
    const upperChain = chain.toUpperCase(); // enum values are lowercase, env keys are uppercase
    return {
      privateKey: this.config.get(`WALLET_${upperChain}_PRIVATE_KEY`),
      address: this.config.get(`WALLET_${upperChain}_ADDRESS`),
    };
  }

  public getNetworkType(): NetworkType {
    return this.networkType;
  }

  public getCoinGeckoApiKey(): string | undefined {
    return this.coinGeckoApiKey;
  }

  public getRippleWalletCredentials(): RippleWalletCredentials {
    return {
      mnemonic: this.config.get('WALLET_RIPPLE_MNEMONIC'),
      networkType: this.networkType as NetworkType,
    };
  }
}