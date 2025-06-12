import { AbstractWalletService } from "./AbstractWalletService";
import { ConfigService } from "../ConfigService";
import { AccountCreateTransaction, AccountId, Client, Hbar, PrivateKey } from "@hashgraph/sdk";
import { AccountData, NetworkType, SupportedChain } from "../../types";

export class HederaWalletService extends AbstractWalletService {
  private hederaClient: Client;

  constructor(configService: ConfigService) {
    super(configService);
    this.hederaClient = this.client as Client;
  }

  protected initClient(): Client {
    const networkType = this.configService.getWalletCredentials(this.getSupportedChain()).networkType!;
    const hederaAddress = this.configService.getWalletCredentials(this.getSupportedChain()).address!;
    const hederaPrivateKey = this.configService.getWalletCredentials(this.getSupportedChain()).privateKey!;

    return this.createClient(networkType, hederaAddress, hederaPrivateKey);
  }

  public getClient(): Client {
    return this.hederaClient;
  }

  public async createAccountAndReturnClient(autoAssociation?: number): Promise<Client> {
    const accountData = await this.createAccount(autoAssociation);
    return this.createClient(
      this.configService.getWalletCredentials(this.getSupportedChain()).networkType!,
      accountData.accountAddress,
      accountData.privateKey
    );
  }

  public async createAccount(autoAssociation?: number): Promise<AccountData> {
    const accountPrivateKey = PrivateKey.generateECDSA();
    const accountPublicKey = accountPrivateKey.publicKey;

    const tx = new AccountCreateTransaction()
      .setKey(accountPublicKey)
      .setInitialBalance(new Hbar(10)) // 10 HBARs will be sent from the connected account to the newly created one
      .setMaxAutomaticTokenAssociations(autoAssociation || 0); // if not set, then no auto association. To set unlimited pass -1

    const txResponse = await tx.execute(this.hederaClient);
    const receipt = await txResponse.getReceipt(this.hederaClient);

    if (!receipt.status.toString().includes("SUCCESS"))
      throw new Error("Account creation failed");

    const accountId = receipt.accountId!;
    return {
      accountAddress: accountId!.toString(),
      privateKey: accountPrivateKey.toStringRaw(),
      publicKey: accountPublicKey.toStringRaw(),
    };
  }


  protected createClient(networkType: NetworkType, hederaAddress: string, hederaPrivateKey: string): Client {
    let client: Client;

    switch (networkType) {
      case NetworkType.MAINNET:
        client = Client.forMainnet();
        break;
      case NetworkType.TESTNET:
        client = Client.forTestnet();
        break;
      case NetworkType.PREVIEWNET:
        client = Client.forPreviewnet();
        break;
      default:
        throw new Error("Unsupported network type");
    }

    if (!hederaPrivateKey) {
      throw new Error(
        `No wallet credentials found for ${this.getSupportedChain()}. Please set WALLET_${this.getSupportedChain().toUpperCase()}_PRIVATE_KEY in your .env file`
      );
    }

    const accountId = AccountId.fromString(hederaAddress);
    const privateKey = PrivateKey.fromStringECDSA(hederaPrivateKey);

    console.log(`Hedera client initialized with address: ${hederaAddress}.`);

    return client.setOperator(accountId, privateKey);
  }

  protected getSupportedChain(): SupportedChain {
    return SupportedChain.HEDERA;
  }
}