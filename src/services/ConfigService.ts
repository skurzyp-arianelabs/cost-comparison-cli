import { WalletCredentials } from '../types';
import dotenv from 'dotenv';

dotenv.config();

// TODO: change to singleton
export class ConfigService {
  private config: Map<string, any> = new Map();

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    //TODO: Load wallet credentials from environment, ONLY PRIVATE KEYS FOR NOW, ADD MNEMONICS AND ACCOUNT IDs/ADDRESS
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('WALLET_')) {
        this.config.set(key, process.env[key]);
      }
    });
  }

  getWalletCredentials(chain: string): WalletCredentials {
    const upperChain = chain.toUpperCase();
    return {
      privateKey: this.config.get(`WALLET_${upperChain}_PRIVATE_KEY`),
    };
  }
}
