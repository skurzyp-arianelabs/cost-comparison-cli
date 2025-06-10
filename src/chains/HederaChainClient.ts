import { ChainConfig, SupportedOperation, TransactionResult } from '../types';
import { ConfigService } from "../services/ConfigService";
import { AbstractChainClient } from "./abstract/AbstractChainClient";
import {
  AccountId, AccountInfoQuery,
  Client,
  PrivateKey,
  Status,
  TokenCreateTransaction, TokenMintTransaction,
  TokenType
} from "@hashgraph/sdk";

export class HederaChainClient extends AbstractChainClient {
  private readonly client: Client;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    super(chainConfig, configService);
    const client = Client.forTestnet();
    const accountId = AccountId.fromString(this.credentials.address!);
    const privateKey = PrivateKey.fromStringECDSA(this.credentials.privateKey!);
    console.log(`accountId: ${accountId.toString()}`);
    console.log(`privateKey: ${privateKey.toString()}`);
    this.client = client.setOperator(accountId, privateKey);
  }

  async isHealthy(): Promise<boolean> {
    try {
      // If the query succeeds, the client is connected to the network
      const _accountInfo = await new AccountInfoQuery()
        .setAccountId(this.client.operatorAccountId!)
        .execute(this.client);
      return true;
    } catch (error) {
      console.error("Hedera client health check failed:", error);
      return false;
    }
  }

  // Native Fungible Token Operations
  async createNativeFT(): Promise<TransactionResult> {
    // 1. create a new token

    const tx = new TokenCreateTransaction()
      .setTokenName("Your Token Name")
      .setTokenSymbol("F")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(this.client.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.client);
    const txReceipt = await txResponse.getReceipt(this.client);
    const txRecord = await txResponse.getRecord(this.client);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: txResponse.transactionId.toString(), //TODO: check if it the txHash
      gasUsed: txRecord.transactionFee.toString(), // TODO: validate
      gasPrice: 'TODO', // TODO: find from where to take
      totalCost: 'TODO', // TODO: fetch hbar price, gas price and gas used
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: 'TODO', // TODO: fetch hbar price, gas price and gas used
      timestamp: Date.now().toLocaleString(), // TODO: should be possible to get from recipit
      status: txReceipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }
  }

  async associateNativeFT(): Promise<TransactionResult> {
    // 1. create new token from account form envs
    // 2. create new account with limited autoassociation
    // 3. associate the new account with token and get the tx report
    throw new Error('Method not implemented.');
  }

  async mintNativeFT(): Promise<TransactionResult> {
    // 1. create new token
    // 2. mint the new token

    const tx = new TokenCreateTransaction()
      .setTokenName("Your Token Name")
      .setTokenSymbol("F")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(this.client.operatorAccountId!)
      .setSupplyKey(this.client.operatorPublicKey!);

    const txResponse = await tx.execute(this.client);
    const txReceipt = await txResponse.getReceipt(this.client);
    const tokenId = txReceipt.tokenId!;
    console.debug(`Created tokenId: ${tokenId.toString()}`);

    const tx2 = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(1000);

    const tx2Response = await tx2.execute(this.client);
    const tx2Receipt = await tx2Response.getReceipt(this.client);
    const tx2Record = await tx2Response.getRecord(this.client);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(), //TODO: check if it the txHash
      gasUsed: tx2Record.transactionFee.toString(), // TODO: validate
      gasPrice: 'TODO', // TODO: find from where to take
      totalCost: 'TODO', // TODO: fetch hbar price, gas price and gas used
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: 'TODO', // TODO: fetch hbar price, gas price and gas used
      timestamp: Date.now().toLocaleString(), // TODO: should be possible to get from recipit
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }
  }

  async transferNativeFT(): Promise<TransactionResult> {
    // 1. create new token
    // 2. create 2nd account
    // 3. transfer the new token to the new account
    throw new Error('Method not implemented.');
  }

}