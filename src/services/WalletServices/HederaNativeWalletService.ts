import { ConfigService } from '../ConfigService/ConfigService';
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  PrivateKey,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenId,
  TokenSupplyType,
  TokenType,
  TransactionReceipt,
  TransactionRecord,
  TransactionResponse,
} from '@hashgraph/sdk';
import { AccountData, NetworkType, SupportedChain } from '../../types';
import { wait } from '../../chains/Hedera/hederaUtils';

export interface HederaSdkRawResponse {
  txResponse: TransactionResponse;
  txRecord: TransactionRecord;
  txReceipt: TransactionReceipt;
}

export class HederaNativeWalletService {
  private hederaClient: Client; // main client for account from envs
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.hederaClient = this.initClient();
  }

  protected initClient(): Client {
    const networkType = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).networkType!;
    const hederaAddress = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).address!;
    const hederaPrivateKey = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).privateKey!;

    return this.createClient(networkType, hederaAddress, hederaPrivateKey);
  }

  public async createAccountAndReturnClient(
    autoAssociation?: number
  ): Promise<Client> {
    const accountData = await this.createAccount(autoAssociation);

    return this.createClient(
      this.configService.getWalletCredentials(SupportedChain.HEDERA)
        .networkType!,
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

    if (!receipt.status.toString().includes('SUCCESS'))
      throw new Error('Account creation failed');

    const accountId = receipt.accountId!;
    return {
      accountAddress: accountId!.toString(),
      privateKey: accountPrivateKey.toStringRaw(),
      publicKey: accountPublicKey.toStringRaw(),
    };
  }

  protected createClient(
    networkType: NetworkType,
    hederaAddress: string,
    hederaPrivateKey: string
  ): Client {
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
        throw new Error('Unsupported network type');
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

  public async createFT(
    tokenName: string = 'Your Token Name',
    tokenSymbol: string = 'F',
    initialSupply: number = 1000,
    decimals: number = 0,
    treasuryAccountId?: string,
    supplyKey?: any
  ): Promise<{
    txResponse: TransactionResponse;
    txReceipt: TransactionReceipt;
    txRecord: TransactionRecord;
    tokenId: TokenId;
  }> {
    const tx = new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(
        treasuryAccountId || this.hederaClient.operatorAccountId!
      )
      .setSupplyKey(supplyKey || this.hederaClient.operatorPublicKey)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);
    const tokenId = txReceipt.tokenId!;

    return { txResponse, txReceipt, txRecord, tokenId };
  }

  public async createNFT(
    tokenName: string = 'Your Token Name',
    tokenSymbol: string = 'F',
    maxSupply: number = 1000,
    treasuryAccountId?: string,
    supplyKey?: any
  ): Promise<{
    txResponse: TransactionResponse;
    txReceipt: TransactionReceipt;
    txRecord: TransactionRecord;
    tokenId: TokenId;
  }> {
    const tx = new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setDecimals(0)
      .setMaxSupply(maxSupply)
      .setTreasuryAccountId(
        treasuryAccountId || this.hederaClient.operatorAccountId!
      )
      .setSupplyKey(supplyKey || this.hederaClient.operatorPublicKey)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);
    const tokenId = txReceipt.tokenId!;

    return { txResponse, txReceipt, txRecord, tokenId };
  }

  private async deployContract(
    bytecode: string,
    gas: number,
    constructorParams?: ContractFunctionParameters
  ): Promise<{
    contractId: any;
    txResponse: TransactionResponse;
    txRecord: TransactionRecord;
    txReceipt: TransactionReceipt;
  }> {
    const contractCreateTx = new ContractCreateFlow()
      .setGas(gas)
      .setBytecode(bytecode);

    if (constructorParams) {
      contractCreateTx.setConstructorParameters(constructorParams);
    }

    const txResponse = await contractCreateTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);
    const contractId = txRecord.receipt.contractId!;

    return { contractId, txResponse, txRecord, txReceipt };
  }

  private async executeContractFunction(
    contractId: any,
    functionName: string,
    gas: number,
    params?: ContractFunctionParameters,
    maxFee: Hbar = new Hbar(10)
  ): Promise<{
    txResponse: TransactionResponse;
    txRecord: TransactionRecord;
    txReceipt: TransactionReceipt;
  }> {
    const contractExecuteTx = new ContractExecuteTransaction()
      .setGas(gas)
      .setMaxTransactionFee(maxFee)
      .setContractId(contractId)
      .setFunction(functionName, params);

    const txResponse = await contractExecuteTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    return { txResponse, txRecord, txReceipt };
  }

  async createNativeFT(): Promise<{
    txResponse: TransactionResponse;
    txReceipt: TransactionReceipt;
    txRecord: TransactionRecord;
    tokenId: TokenId;
  }> {
    return await this.createFT();
  }

  async associateNativeFT(): Promise<{
    txResponse: TransactionResponse;
    txReceipt: TransactionReceipt;
    txRecord: TransactionRecord;
  }> {
    // 0. create a new account
    const newAccountClient = await this.createAccountAndReturnClient();

    await wait(5000);

    // 1. create a token
    const { tokenId } = await this.createNativeFT();

    // 3. associate the new account with the token and get the tx report
    const txAssociate = new TokenAssociateTransaction()
      .setAccountId(newAccountClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const txAssociateResponse = await txAssociate.execute(newAccountClient);
    const txAssociateReceipt =
      await txAssociateResponse.getReceipt(newAccountClient);
    const txAssociateRecord =
      await txAssociateResponse.getRecord(newAccountClient);

    return {
      txResponse: txAssociateResponse,
      txReceipt: txAssociateReceipt,
      txRecord: txAssociateRecord,
    };
  }
}
