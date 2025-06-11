import { SupportedChain, WalletCredentials } from '../types';
import dotenv from 'dotenv';

dotenv.config();

// TODO: change to singleton
export class ConfigService {
  private config: Map<string, any> = new Map();

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    //TODO: Load wallet credentials from environment, ONLY PRIVATE KEYS FOR NOW, ADD MNEMONICS
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
      networkType: this.config.get(`WALLET_${upperChain}_NETWORK_TYPE`),
    };
  }
}
