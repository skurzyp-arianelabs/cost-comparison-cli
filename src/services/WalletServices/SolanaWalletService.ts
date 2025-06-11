import { AbstractWalletService } from './AbstractWalletService';
import { ConfigService } from '../ConfigService';
import { Connection, Keypair, Commitment } from '@solana/web3.js';
import { SupportedChain } from '../../types';

export class SolanaWalletService extends AbstractWalletService {
  private connection: Connection;

  constructor(configService: ConfigService) {
    super(configService);
    this.connection = this.initClient();
  }

  protected initClient(): Connection {
    const rpcUrl = this.getRpcUrl();
    const commitment: Commitment = 'confirmed';
    return new Connection(rpcUrl, commitment);
  }

  public getClient(): Connection {
    return this.connection;
  }

  public getKeypair(): Keypair {
    const privateKeyHex = this.configService.getWalletCredentials(
      this.getSupportedChain()
    ).privateKey!;

    return Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKeyHex, 'hex'))
    );
  }

  public async createAccountAndReturnClient(): Promise<any> {
    throw new Error('Not implemented for Solana.');
  }

  public async createAccount(): Promise<any> {
    throw new Error('Not implemented for Solana.');
  }

  protected createClient(): Connection {
    return this.initClient(); // fallback
  }

  protected getSupportedChain(): SupportedChain {
    return SupportedChain.SOLANA;
  }

  private getRpcUrl(): string {
    const rpcFromEnv = process.env[`SOLANA_RPC_URL`];
    if (!rpcFromEnv) {
      throw new Error('Missing SOLANA_RPC_URL in .env');
    }
    return rpcFromEnv;
  }
}
