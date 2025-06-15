import {
  createNonceManager,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from 'viem';
import {
  AccountData,
  ExtendedChain,
  NetworkType,
  SupportedChain,
} from '../../types';
import { AbstractWalletService } from './AbstractWalletService';
import { ConfigService } from '../ConfigService/ConfigService';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { jsonRpc } from 'viem/nonce';
import { PrivateKey } from '@hashgraph/sdk';

export class EvmWalletService extends AbstractWalletService {
  private readonly viemWalletClient: WalletClient;
  private readonly viemPublicClient: PublicClient;
  private readonly chain: ExtendedChain;
  private readonly supportedChain: SupportedChain;

  constructor(configService: ConfigService, supportedChain: SupportedChain) {
    super(configService);
    this.supportedChain = supportedChain;
    this.chain = this.configService.getChainConfig(this.supportedChain);
    this.viemWalletClient = this.initClient();
    this.viemPublicClient = this.initPublicClient();
  }

  protected initClient(): WalletClient {
    const networkType = this.configService.getWalletCredentials(
      this.supportedChain
    ).networkType!;
    const privateKey = this.configService.getWalletCredentials(
      this.supportedChain
    ).privateKey!;

    if (this.supportedChain === SupportedChain.HEDERA)
      return this.createClient(networkType, this.parseDerKeyToHex(privateKey));
    else return this.createClient(networkType, privateKey);
  }

  private initPublicClient(): PublicClient {
    const rpcUrl = this.getRpcUrl();

    return createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });
  }

  public getClient(): WalletClient {
    return this.viemWalletClient;
  }

  public getPublicClient(): PublicClient {
    return this.viemPublicClient;
  }

  public async createAccountAndReturnClient(
    autoAssociation?: number
  ): Promise<WalletClient> {
    const accountData = await this.createAccount(autoAssociation);
    const networkType = this.configService.getWalletCredentials(
      this.supportedChain
    ).networkType!;

    return this.createClient(networkType, accountData.privateKey);
  }

  public async createAccount(autoAssociation?: number): Promise<AccountData> {
    // Generate a new private key
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // For EVM chains, accounts are created automatically when they receive their first transaction
    // Unlike Hedera, we don't need to explicitly create the account on-chain
    // The account exists as soon as we have the private/public key pair

    return {
      accountAddress: account.address,
      privateKey: privateKey,
      publicKey: `0x${account.publicKey.slice(4)}`, // Remove '0x04' prefix from uncompressed public key
    };
  }

  protected createClient(
    networkType: NetworkType,
    privateKey: string
  ): WalletClient {
    if (!privateKey) {
      throw new Error(
        `No wallet credentials found for ${this.supportedChain}. Please set WALLET_${this.supportedChain.toUpperCase()}_PRIVATE_KEY in your .env file`
      );
    }

    const rpcUrl = this.getRpcUrl(networkType);

    const account = privateKeyToAccount(privateKey as `0x${string}`, {
      nonceManager: createNonceManager({
        source: jsonRpc(),
      }),
    });

    return createWalletClient({
      account,
      chain: this.chain,
      transport: http(rpcUrl),
    });
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

  protected getSupportedChain(): SupportedChain {
    return this.supportedChain;
  }

  private parseDerKeyToHex(derKey: string): `0x${string}` {
    const der = PrivateKey.fromStringDer(derKey);
    const raw = der.toBytesRaw();

    const hex = Buffer.from(raw).toString('hex').padStart(64, '0');
    return `0x${hex}`;
  }
}
