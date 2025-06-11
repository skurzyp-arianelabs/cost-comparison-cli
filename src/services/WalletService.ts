import { ConfigService } from "./ConfigService";
import { AccountId, Client, PrivateKey } from "@hashgraph/sdk";
import { NetworkType, SupportedChain } from "../types";

export class WalletService {
  private hederaClient;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.hederaClient = this.initHederaClient();
  }

  private initHederaClient() {
    const networkType = this.configService.getWalletCredentials(SupportedChain.HEDERA).networkType!;
    const hederaAddress = this.configService.getWalletCredentials(SupportedChain.HEDERA).address!
    const hederaPrivateKey = this.configService.getWalletCredentials(SupportedChain.HEDERA).privateKey!

    let client;

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
        `No wallet credentials found for ${SupportedChain.HEDERA}. Please set WALLET_${SupportedChain.HEDERA.toUpperCase()}_PRIVATE_KEY in your .env file`
      );
    }

    const accountId = AccountId.fromString(hederaAddress);
    const privateKey = PrivateKey.fromStringECDSA(hederaPrivateKey);

    console.log(`Hedera client initialized with address: ${hederaAddress}.`);

    return client.setOperator(accountId, privateKey);
  }

  public getHederaClient() {
    return this.hederaClient;
  }
}