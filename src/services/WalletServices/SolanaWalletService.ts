import { Connection, Keypair, Commitment } from '@solana/web3.js';
import { AbstractWalletService } from './AbstractWalletService';
import { ConfigService } from '../ConfigService/ConfigService';
import {
  AccountData,
  ExtendedChain,
  NetworkType,
  SupportedChain,
} from '../../types';

export class SolanaWalletService extends AbstractWalletService {
  private connection: Connection;
  private readonly supportedChain: SupportedChain;
  private readonly chain: ExtendedChain;

  constructor(configService: ConfigService) {
    super(configService);
    this.supportedChain = SupportedChain.SOLANA;
    this.chain = this.configService.getChainConfig(this.supportedChain);
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

  public async createAccountAndReturnClient(): Promise<any> {
    throw new Error('Not implemented for Solana.');
  }

  public async createAccount(): Promise<AccountData> {
    const privateKeyHex = this.configService.getWalletCredentials(
      this.getSupportedChain()
    ).privateKey!;
    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(privateKeyHex, 'hex'))
    );

    return {
      accountAddress: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBase58(),
      privateKey: privateKeyHex,
    };
  }

  protected createClient(): Connection {
    return this.initClient();
  }

  protected getSupportedChain(): SupportedChain {
    return SupportedChain.SOLANA;
  }

  private getRpcUrl(networkType?: NetworkType): string {
    const network =
      networkType ||
      this.configService.getWalletCredentials(this.supportedChain).networkType!;

    const chainConfig = this.chain;

    if (chainConfig.rpcUrls.default.http[0]) {
      return chainConfig.rpcUrls.default.http[0];
    }

    throw new Error(
      `No RPC URL configured for ${this.supportedChain} on ${network}`
    );
  }
}
