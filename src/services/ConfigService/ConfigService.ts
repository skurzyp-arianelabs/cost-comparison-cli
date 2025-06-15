import {
  ExtendedChain,
  NetworkType,
  SupportedChain,
  WalletCredentials,
} from '../../types';
import dotenv from 'dotenv';
import { initSupportedChains } from './ChainsConfig';

dotenv.config();

export class ConfigService {
  private config: Map<string, any> = new Map();
  private chainsConfigs: ExtendedChain[];
  private networkType: NetworkType | undefined;

  constructor() {
    this.loadFromEnv();
    this.chainsConfigs = initSupportedChains();
  }

  public getChainConfig(chainType: SupportedChain): ExtendedChain {
    return this.chainsConfigs.find(
      (c) => c.type === chainType && c.network === this.networkType
    )!;
  }

  private loadFromEnv(): void {
    const networkType = process.env.NETWORK_TYPE?.toLowerCase();
    if (
      !networkType ||
      !Object.values(NetworkType).includes(networkType as NetworkType)
    ) {
      throw new Error(
        `Invalid or missing NETWORK_TYPE in environment: received "${networkType}"`
      );
    }
    this.networkType = networkType as NetworkType;

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
      networkType: this.networkType,
    };
  }
}
