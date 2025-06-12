import { ChainConfig, SupportedOperation, TransactionResult } from '../types';
import { ConfigService } from "../services/ConfigService";
import { AbstractChainClient } from "./abstract/AbstractChainClient";
import {
  AccountInfoQuery,
  Client,
  Status,
  TokenAssociateTransaction,
  TokenCreateTransaction, TokenMintTransaction,
  TokenType, TransferTransaction
} from "@hashgraph/sdk";

import { BigNumber } from "bignumber.js";
import { HederaWalletService } from "../services/WalletServices/HederaWalletService";

export class HederaChainClient extends AbstractChainClient {
  private readonly client: Client;

  constructor(chainConfig: ChainConfig, configService: ConfigService) {
    const hederaWalletService = new HederaWalletService(configService)
    super(chainConfig, configService, hederaWalletService);
    this.client = this.walletService.getClient();
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
  /**
   * Key: create-native-ft
   * Steps:
   * 1. create new a token
   */
  async createNativeFT(): Promise<TransactionResult> {
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

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())["hedera-hashgraph"].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: txRecord.transactionFee.toBigNumber().multipliedBy(hbarPriceBN).toString(), // TODO: might require changing the type to BigNumber
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }
  }

  /**
   * key: associate-native-ft
   *  1. create a new token from an account from envs
   *  2. create a new account with limited autoassociation
   *  3. associate the new account with the token and get the tx report
   */
  async associateNativeFT(): Promise<TransactionResult> {
    // 1. create a new account
    const newAccountClient = await this.walletService.createAccountAndReturnClient();

    // 2. create a token from the newly crated account
    const tx = new TokenCreateTransaction()
      .setTokenName("Your Token Name")
      .setTokenSymbol("F")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(newAccountClient.operatorAccountId!)
      .setSupplyKey(newAccountClient.operatorPublicKey!);

    const txResponse = await tx.execute(newAccountClient);
    const txReceipt = await txResponse.getReceipt(newAccountClient);
    const tokenId = txReceipt.tokenId!;

    // 3. associate the account from env with the token and get the tx report
    const tx2 = new TokenAssociateTransaction()
      .setAccountId(this.client.operatorAccountId!)
      .setTokenIds([tokenId]) //Fill in the token ID

    const tx2Response = await tx2.execute(this.client);
    const tx2Receipt = await tx2Response.getReceipt(this.client);
    const tx2Record = await tx2Response.getRecord(this.client);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())["hedera-hashgraph"].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: tx2Record.transactionFee.toBigNumber().multipliedBy(hbarPriceBN).toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }
  }

  /**
   * Key: mint-native-ft
   * Steps:
   * 1. create new token
   * 2. mint the new token
   */
  async mintNativeFT(): Promise<TransactionResult> {
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

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())["hedera-hashgraph"].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: tx2Record.transactionFee.toBigNumber().multipliedBy(hbarPriceBN).toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }
  }

  /**
   * key: transfer-native-ft
   * Steps:
   * 1. create a new account with autoassociation
   * 2. create a token
   * 3. transfer the new token to the new account
   */
  async transferNativeFT(): Promise<TransactionResult> {
    // 1. create a new account
    const AUTOASSOCIATION_LIMIT = -1; // unlimited autoassociation
    const newAccountClient = await this.walletService.createAccountAndReturnClient(AUTOASSOCIATION_LIMIT);

    // 2. create a token from the newly crated account
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

    // 3. associate the token to the created account
    const tx2 = new TransferTransaction()
      .addTokenTransfer(tokenId, this.client.operatorAccountId!, -1)
      .addTokenTransfer(tokenId, newAccountClient.operatorAccountId!, 1);


    const tx2Response = await tx2.execute(this.client);
    const tx2Receipt = await tx2Response.getReceipt(this.client);
    const tx2Record = await tx2Response.getRecord(this.client);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())["hedera-hashgraph"].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency,
      usdCost: tx2Record.transactionFee.toBigNumber().multipliedBy(hbarPriceBN).toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    }

  }


  async createERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
  async transferERC20_SDK(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async createERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }

  async mintERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
  async transferERC20_RPC(): Promise<TransactionResult> {
    throw new Error('Method not implemented.');
  }
}