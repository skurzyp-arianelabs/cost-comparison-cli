import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  BASE_FEE,
} from 'stellar-sdk';
import { AbstractWalletService } from './AbstractWalletService';
import { ConfigService } from '../ConfigService/ConfigService';
import {
  AccountData,
  ExtendedChain,
  SupportedChain,
  WalletCredentials,
} from '../../types';

function getStellarNetworkPassphrase(network: string): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

export class StellarWalletService extends AbstractWalletService {
  private readonly supportedChain = SupportedChain.STELLAR;
  private readonly chain: ExtendedChain;
  private readonly server: Horizon.Server;
  private readonly issuerKeypair: Keypair;
  private readonly networkPassphrase: string;

  constructor(configService: ConfigService) {
    super(configService);
    this.chain = this.configService.getChainConfig(this.supportedChain);
    this.server = new Horizon.Server(this.chain.rpcUrls.default.http[0]!);

    const credentials: WalletCredentials =
      this.configService.getWalletCredentials(this.supportedChain);
    if (!credentials.privateKey) {
      throw new Error('Missing Stellar private key in environment');
    }

    this.issuerKeypair = Keypair.fromSecret(credentials.privateKey);
    this.networkPassphrase = getStellarNetworkPassphrase(this.chain.network);
  }

  protected initClient(): Horizon.Server {
    return this.server;
  }

  protected createClient(): Horizon.Server {
    return this.server;
  }

  public getClient(): Horizon.Server {
    return this.server;
  }

  public async createAccount(): Promise<AccountData> {
    const newKeypair = Keypair.random();

    const issuerAccount = await this.server.loadAccount(
      this.issuerKeypair.publicKey()
    );

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.createAccount({
          destination: newKeypair.publicKey(),
          startingBalance: '3.0000000',
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(this.issuerKeypair);

    try {
      await this.server.submitTransaction(tx);
    } catch (error: any) {
      console.error(
        'Error submitting createAccount tx:',
        error?.response?.data || error?.message || error
      );
      throw new Error('Failed to create distributor account');
    }

    return {
      accountAddress: newKeypair.publicKey(),
      privateKey: newKeypair.secret(),
      publicKey: newKeypair.publicKey(),
    };
  }

  public async createAccountAndReturnClient(): Promise<{
    account: AccountData;
    client: Horizon.Server;
  }> {
    const account = await this.createAccount();

    return {
      account,
      client: this.server,
    };
  }

  protected getSupportedChain(): SupportedChain {
    return this.supportedChain;
  }

  public getIssuerKeypair(): Keypair {
    return this.issuerKeypair;
  }

  public getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }
}
