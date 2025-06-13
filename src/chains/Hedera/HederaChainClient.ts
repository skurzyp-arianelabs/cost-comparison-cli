import {
  ExtendedChain,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { AbstractChainClient } from '../abstract/AbstractChainClient';
import {
  AccountInfoQuery,
  Client,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  EvmAddress,
  Hbar,
  NftId,
  Status,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TransferTransaction,
} from '@hashgraph/sdk';

import { BigNumber } from 'bignumber.js';
import { HederaWalletService } from '../../services/WalletServices/HederaWalletService';
import erc20Compiled from './contracts/ERC-20.json';
import erc721Compiled from './contracts/ERC-721.json';
import { HederaMirrorNodeService } from '../../services/ApiService/HederaMirrorNodeService';
import { getEvmCompatibleAddress, wait } from './hederaUtils';
import { EvmWalletService } from '../../services/WalletServices/EvmWalletService';
import {
  Abi,
  formatUnits,
  getContract, parseUnits,
  PublicClient,
  WalletClient,
} from 'viem';

export class HederaChainClient extends AbstractChainClient {
  private readonly hederaClient: Client;
  private readonly hederaMirrorNodeService: HederaMirrorNodeService;
  private readonly evmWalletService: EvmWalletService;
  private readonly viemClient: WalletClient;
  private readonly viemPublicClient: PublicClient;

  constructor(chainConfig: ExtendedChain, configService: ConfigService) {
    const hederaWalletService = new HederaWalletService(configService);
    super(chainConfig, configService, hederaWalletService);
    this.hederaClient = this.walletService.getClient();
    this.hederaMirrorNodeService = new HederaMirrorNodeService(configService);
    this.evmWalletService = new EvmWalletService(
      configService,
      SupportedChain.HEDERA
    );
    this.viemClient = this.evmWalletService.getClient();
    this.viemPublicClient = this.evmWalletService.getPublicClient();
  }

  async isHealthy(): Promise<boolean> {
    try {
      // If the query succeeds, the client is connected to the network
      const _accountInfo = await new AccountInfoQuery()
        .setAccountId(this.hederaClient.operatorAccountId!)
        .execute(this.hederaClient);
      return true;
    } catch (error) {
      console.error('Hedera client health check failed:', error);
      return false;
    }
  }

  // Native Fungible Token Operations
  /**
   * Key: create-native-ft
   * Steps:
   * 1. create a new token
   */
  async createNativeFT(): Promise<TransactionResult> {
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(this.hederaClient.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_NATIVE_FT,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  /**
   * key: associate-native-ft
   *  1. create a new token from an account from envs
   *  2. create a new account with limited autoassociation
   *  3. associate the new account with the token and get the tx report
   */
  async associateNativeFT(): Promise<TransactionResult> {
    // 1. create a new account
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient();

    await wait(5000);

    // 2. create a token from the newly crated account
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
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
      .setAccountId(this.hederaClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx2Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  /**
   * Key: mint-native-ft
   * Steps:
   * 1. create new token
   * 2. mint the new token
   */
  async mintNativeFT(): Promise<TransactionResult> {
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(this.hederaClient.operatorAccountId!)
      .setSupplyKey(this.hederaClient.operatorPublicKey!);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const tokenId = txReceipt.tokenId!;
    console.debug(`Created tokenId: ${tokenId.toString()}`);

    const tx2 = new TokenMintTransaction().setTokenId(tokenId).setAmount(1000);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx2Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
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
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient(
        AUTOASSOCIATION_LIMIT
      );

    // 2. create a token from the newly crated account
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1000)
      .setTreasuryAccountId(this.hederaClient.operatorAccountId!)
      .setSupplyKey(this.hederaClient.operatorPublicKey!);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const tokenId = txReceipt.tokenId!;

    // 3. associate the token to the created account
    const tx2 = new TransferTransaction()
      .addTokenTransfer(tokenId, this.hederaClient.operatorAccountId!, -1)
      .addTokenTransfer(tokenId, newAccountClient.operatorAccountId!, 1);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_FT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx2Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  async createNativeNFT(): Promise<TransactionResult> {
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setSupplyKey(this.hederaClient.operatorPublicKey!)
      .setDecimals(0)
      .setMaxSupply(1000)
      .setTreasuryAccountId(this.hederaClient.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_NATIVE_NFT,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    // 1. create a new account
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient();

    // 2. create a token from the newly crated account
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setSupplyKey(newAccountClient.operatorPublicKey!)
      .setDecimals(0)
      .setMaxSupply(1000)
      .setTreasuryAccountId(newAccountClient.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(newAccountClient);
    const txReceipt = await txResponse.getReceipt(newAccountClient);
    const tokenId = txReceipt.tokenId!;

    // 3. associate the account from env with the token and get the tx report
    const tx2 = new TokenAssociateTransaction()
      .setAccountId(this.hederaClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_NFT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx2Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setSupplyKey(this.hederaClient.operatorPublicKey!)
      .setDecimals(0)
      .setMaxSupply(1000)
      .setTreasuryAccountId(this.hederaClient.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const tokenId = txReceipt.tokenId!;

    const tx2 = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([
        new TextEncoder().encode(
          'https://ipfs.io/ipfs/QmTW9HWfb2wsQqEVJiixkQ73Nsfp2Rx4ESaDSiQ7ThwnFM'
        ),
      ]);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_NATIVE_NFT,
      transactionHash: tx2Response.transactionId.toString(),
      totalCost: tx2Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx2Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx2Record.consensusTimestamp.toString(),
      status: tx2Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    // 1. create a new account
    const AUTOASSOCIATION_LIMIT = -1; // unlimited autoassociation
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient(
        AUTOASSOCIATION_LIMIT
      );

    // 2. create a token from the newly crated account
    const tx = new TokenCreateTransaction()
      .setTokenName('Your Token Name')
      .setTokenSymbol('F')
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setSupplyKey(newAccountClient.operatorPublicKey!)
      .setDecimals(0)
      .setMaxSupply(1000)
      .setTreasuryAccountId(newAccountClient.operatorAccountId!)
      .setTransactionValidDuration(180);

    const txResponse = await tx.execute(newAccountClient);
    const txReceipt = await txResponse.getReceipt(newAccountClient);
    const tokenId = txReceipt.tokenId!;

    // 3. Mint token
    const tx2 = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([
        new TextEncoder().encode(
          'https://ipfs.io/ipfs/QmTW9HWfb2wsQqEVJiixkQ73Nsfp2Rx4ESaDSiQ7ThwnFM'
        ),
      ]);

    const tx2Response = await tx2.execute(newAccountClient);
    const tx2Receipt = await tx2Response.getReceipt(newAccountClient);
    const serialNumber = tx2Receipt.serials[0]!;

    // 4. transfer token to account from envs
    const tx3 = new TransferTransaction().addNftTransfer(
      new NftId(tokenId, serialNumber!),
      newAccountClient.operatorAccountId!,
      this.hederaClient.operatorAccountId!
    );

    const tx3Response = await tx3.execute(this.hederaClient);
    const tx3Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx3Record = await tx2Response.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.ASSOCIATE_NATIVE_NFT,
      transactionHash: tx3Response.transactionId.toString(),
      totalCost: tx3Record.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: tx3Record.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: tx3Record.consensusTimestamp.toString(),
      status: tx3Receipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  /**
   * Key: deploy-erc20-sdk
   * 1. Load bytecode of compiled erc-20 smart contract
   * 2. Deploy ERC20 contract
   */
  async createERC20_SDK(): Promise<TransactionResult> {
    // 1. Load bytecode of a compiled erc-20 smart contract
    const bytecode = erc20Compiled.bytecode;

    // 2. Deploy ERC20 contract
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    const contractCreateTx = new ContractCreateFlow()
      .setGas(1095808) // TODO: why?
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );
    const txResponse = await contractCreateTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_ERC20_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(), // TODO: might require changing the type to BigNumber
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed', // TODO: define as enum
    };
  }

  /**
   * Key: mint-erc20-sdk
   * 1. Deploy ERC20 contract
   * 2. Call mint function on the contract
   */
  async mintERC20_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC20 contract
    const bytecode = erc20Compiled.bytecode;
    const contractCreateTx = new ContractCreateFlow()
      .setGas(1095808) // TODO: Why?
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    const createResponse = await contractCreateTx.execute(this.hederaClient);
    const createRecord = await createResponse.getRecord(this.hederaClient);
    const contractId = createRecord.receipt.contractId!;

    // 2. Call mint function on the contract
    const mintAmount = 10000;
    const contractExecuteTx = new ContractExecuteTransaction()
      .setGas(100388)
      .setMaxTransactionFee(new Hbar(10)) // safely assuming 10 HBARs fee limit
      .setContractId(contractId)
      .setFunction(
        'mint',
        new ContractFunctionParameters()
          .addAddress(evmAddress)
          .addUint256(mintAmount)
      );

    const txResponse = await contractExecuteTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_ERC20_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.contractFunctionResult?.gasUsed.toString() || '0',
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  /**
   * Key: transfer-erc20-sdk
   *  1. Deploy ERC20 contract
   *  2. Mint some tokens
   *  3. Create a recipient account
   *  4. Call transfer function on the contract
   */
  async transferERC20_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC20 contract
    const bytecode = erc20Compiled.bytecode;
    const contractCreateTx = new ContractCreateFlow()
      .setGas(1095808)
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    const createResponse = await contractCreateTx.execute(this.hederaClient);
    const createRecord = await createResponse.getRecord(this.hederaClient);
    const contractId = createRecord.receipt.contractId!;

    // 2. Mint some tokens
    const mintAmount = 1000;
    const mintTx = new ContractExecuteTransaction()
      .setGas(100388)
      .setMaxTransactionFee(new Hbar(10)) // safely assuming 10 HBARs fee limit
      .setContractId(contractId)
      .setFunction(
        'mint',
        new ContractFunctionParameters()
          .addAddress(evmAddress)
          .addUint256(mintAmount)
      );

    // Execute mint with the owner account
    await mintTx.execute(this.hederaClient);

    // 3. Create a recipient account
    const recipientClient =
      await this.walletService.createAccountAndReturnClient();

    // the getEvmCompatibleAddress uses mirrornode, which must first be refreshed with new data to contain the newly created account details
    await wait(5000);

    const recipientEVMAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      recipientClient.operatorAccountId!
    );

    // 4. Call transfer function on the contract
    const transferAmount = 100;
    const contractExecuteTx = new ContractExecuteTransaction()
      .setGas(56311)
      .setMaxTransactionFee(new Hbar(10))
      .setContractId(contractId)
      .setFunction(
        'transfer',
        new ContractFunctionParameters()
          .addAddress(EvmAddress.fromString(recipientEVMAddress))
          .addUint256(transferAmount)
      );

    const txResponse = await contractExecuteTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.TRANSFER_ERC20_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.contractFunctionResult?.gasUsed.toString() || '0',
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  /**
   * key: deploy-erc20-sdk
   * 1. Load bytecode of compiled erc-20 smart contract
   * 2. Deploy ERC20 contract with use of viem
   */
  async createERC20_RPC(): Promise<TransactionResult> {
    const bytecode = erc20Compiled.bytecode;

    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc20Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const gasUsed = receipt.gasUsed;
    const totalCostTinybar = gasUsed * receipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);
    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_ERC20_HARDHAT,
      transactionHash: deployHash,
      gasUsed: gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: BigNumber(totalCostHbar).multipliedBy(hbarPriceBN).toString(),
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
    };
  }

  async mintERC20_RPC(): Promise<TransactionResult> {
    const bytecode = erc20Compiled.bytecode;
    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc20Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const contract = getContract({
      address: receipt.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: this.viemClient,
    });

    const mintAmount = parseUnits("100", 18); // 100 tokens
    // @ts-ignore
    const mintTxHash = await contract.write.mint([initialOwner, mintAmount])!;

    const mintReceipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    const totalCostTinybar = mintReceipt.gasUsed * mintReceipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;

    const usdCost = BigNumber(totalCostHbar).multipliedBy(hbarUSDPrice).toString();

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_ERC20_HARDHAT,
      transactionHash: mintTxHash,
      gasUsed: mintReceipt.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: mintReceipt.status === 'success' ? 'success' : 'failed',
      blockNumber: mintReceipt.blockNumber.toString(),
      gasPrice: mintReceipt.effectiveGasPrice.toString(),
    };
  }

  async transferERC20_RPC(): Promise<TransactionResult> {
    const bytecode = erc20Compiled.bytecode;
    const recipient = (await this.evmWalletService.createAccount()).accountAddress;
    console.log(`recipient: ${JSON.stringify(recipient)}`);
    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc20Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt1 = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const contract = getContract({
      address: receipt1.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: this.viemClient,
    });

    const mintAmount = parseUnits("100", 18); // 100 tokens
    // @ts-ignore
    const mintTxHash = await contract.write.mint([initialOwner, mintAmount])!;

    await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    const transferAmount = parseUnits("10", 18); // 10 tokens
    // @ts-ignore
    const transferHash = await contract.write.transfer([recipient, transferAmount]);

    const receipt2 = await this.viemPublicClient.waitForTransactionReceipt({
      hash: transferHash,
    });

    const totalCostTinybar = receipt2.gasUsed * receipt2.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;

    const usdCost = BigNumber(totalCostHbar).multipliedBy(hbarUSDPrice).toString();

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.TRANSFER_ERC20_HARDHAT,
      transactionHash: transferHash,
      gasUsed: receipt2.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: receipt2.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt2.blockNumber.toString(),
      gasPrice: receipt2.effectiveGasPrice.toString(),
    };
  }

  /**
   * key: deploy-erc721-sdk
   * 1. Load bytecode of compiled erc-721 smart contract
   * 2. Deploy ERC721 contract with use of viem
   */
  async createERC721_RPC(): Promise<TransactionResult> {
    const bytecode = erc721Compiled.bytecode;

    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc721Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const gasUsed = receipt.gasUsed;
    const totalCostTinybar = gasUsed * receipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_ERC721_HARDHAT,
      transactionHash: deployHash,
      gasUsed: gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: BigNumber(totalCostHbar).multipliedBy(hbarPriceBN).toString(),
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
    };
  }

  async mintERC721_RPC(): Promise<TransactionResult> {
    const bytecode = erc721Compiled.bytecode;
    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc721Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const contract = getContract({
      address: receipt.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemClient,
    });

    // Mint NFT to the initial owner
    // @ts-ignore
    const mintTxHash = await contract.write.safeMint([initialOwner])!;

    const mintReceipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    const totalCostTinybar = mintReceipt.gasUsed * mintReceipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;

    const usdCost = BigNumber(totalCostHbar).multipliedBy(hbarUSDPrice).toString();

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_ERC721_HARDHAT,
      transactionHash: mintTxHash,
      gasUsed: mintReceipt.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: mintReceipt.status === 'success' ? 'success' : 'failed',
      blockNumber: mintReceipt.blockNumber.toString(),
      gasPrice: mintReceipt.effectiveGasPrice.toString(),
    };
  }

  async transferERC721_RPC(): Promise<TransactionResult> {
    const bytecode = erc721Compiled.bytecode;
    const recipient = (await this.evmWalletService.createAccount()).accountAddress;
    console.log(`recipient: ${JSON.stringify(recipient)}`);
    const initialOwner = this.viemClient.account!.address;

    const deployHash = await this.viemClient.deployContract({
      abi: erc721Compiled.abi as Abi,
      bytecode: bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: [initialOwner],
      chain: this.viemClient.chain,
    });

    const receipt1 = await this.viemPublicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const contract = getContract({
      address: receipt1.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemClient,
    });

    // Mint NFT to the initial owner first
    // @ts-ignore
    const mintTxHash = await contract.write.safeMint([initialOwner])!;

    await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    // Get the token ID from the mint transaction logs
    // Token ID 0 will be the first minted token based on the contract logic
    const tokenId = 0;

    // Transfer the NFT from initial owner to recipient
    // @ts-ignore
    const transferHash = await contract.write.transferFrom([initialOwner, recipient, tokenId]);

    const receipt2 = await this.viemPublicClient.waitForTransactionReceipt({
      hash: transferHash,
    });

    const totalCostTinybar = receipt2.gasUsed * receipt2.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;

    const usdCost = BigNumber(totalCostHbar).multipliedBy(hbarUSDPrice).toString();

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.TRANSFER_ERC721_HARDHAT,
      transactionHash: transferHash,
      gasUsed: receipt2.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: receipt2.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt2.blockNumber.toString(),
      gasPrice: receipt2.effectiveGasPrice.toString(),
    };
  }

  /**
   * Key: deploy-erc721-sdk
   * 1. Load bytecode of compiled erc-721 smart contract
   * 2. Deploy ERC721 contract
   */
  async createERC721_SDK(): Promise<TransactionResult> {
    // 1. Load bytecode of a compiled erc-721 smart contract
    const bytecode = erc721Compiled.bytecode;

    // 2. Deploy ERC721 contract
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    const contractCreateTx = new ContractCreateFlow()
      .setGas(2095808) // TODO: adjust gas limit
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );
    const txResponse = await contractCreateTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.CREATE_ERC721_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  /**
   * Key: mint-erc721-sdk
   * 1. Deploy ERC721 contract
   * 2. Call safeMint function on the contract
   */
  async mintERC721_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC721 contract
    const bytecode = erc721Compiled.bytecode;
    const contractCreateTx = new ContractCreateFlow()
      .setGas(2095808) // TODO: adjust gas limit
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    const createResponse = await contractCreateTx.execute(this.hederaClient);
    const createRecord = await createResponse.getRecord(this.hederaClient);
    const contractId = createRecord.receipt.contractId!;

    // 2. Call safeMint function on the contract
    const contractExecuteTx = new ContractExecuteTransaction()
      .setGas(2095808) // TODO: adjust gas limit for ERC721 minting if needed
      .setMaxTransactionFee(new Hbar(10)) // safely assuming 10 HBARs fee limit
      .setContractId(contractId)
      .setFunction(
        'safeMint',
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    const txResponse = await contractExecuteTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.MINT_ERC721_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.contractFunctionResult?.gasUsed.toString() || '0',
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  /**
   * Key: transfer-erc721-sdk
   * 1. Deploy ERC721 contract
   * 2. Mint an NFT
   * 3. Create a recipient account
   * 4. Call transferFrom function on the contract
   */
  async transferERC721_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC721 contract
    const bytecode = erc721Compiled.bytecode;
    const contractCreateTx = new ContractCreateFlow()
      .setGas(2095808) // TODO: adjust gas limit
      .setBytecode(bytecode)
      .setConstructorParameters(
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    const createResponse = await contractCreateTx.execute(this.hederaClient);
    const createRecord = await createResponse.getRecord(this.hederaClient);
    const contractId = createRecord.receipt.contractId!;

    // 2. Mint an NFT
    const mintTx = new ContractExecuteTransaction()
      .setGas(2095808) // TODO: adjust gas limit
      .setMaxTransactionFee(new Hbar(10)) // safely assuming 10 HBARs fee limit
      .setContractId(contractId)
      .setFunction(
        'safeMint',
        new ContractFunctionParameters().addAddress(evmAddress)
      );

    // Execute mint with the owner account
    await mintTx.execute(this.hederaClient);

    // 3. Create a recipient account
    const recipientClient =
      await this.walletService.createAccountAndReturnClient();

    // the getEvmCompatibleAddress uses mirrornode, which must first be refreshed with new data to contain the newly created account details
    await wait(5000);

    const recipientEVMAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      recipientClient.operatorAccountId!
    );

    // 4. Call transferFrom function on the contract
    const tokenId = 0; // First minted token will have ID 0
    const contractExecuteTx = new ContractExecuteTransaction()
      .setGas(2095808) // TODO: adjust gas limit
      .setMaxTransactionFee(new Hbar(10))
      .setContractId(contractId)
      .setFunction(
        'transferFrom',
        new ContractFunctionParameters()
          .addAddress(evmAddress) // from
          .addAddress(EvmAddress.fromString(recipientEVMAddress)) // to
          .addUint256(tokenId) // tokenId
      );

    const txResponse = await contractExecuteTx.execute(this.hederaClient);
    const txReceipt = await txResponse.getReceipt(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);

    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
      ].usd;
    const hbarPriceBN = new BigNumber(hbarUSDPrice);

    return {
      chain: this.chainConfig.type,
      operation: SupportedOperation.TRANSFER_ERC721_SDK,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed: txRecord.contractFunctionResult?.gasUsed.toString() || '0',
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost: txRecord.transactionFee
        .toBigNumber()
        .multipliedBy(hbarPriceBN)
        .toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }
}
