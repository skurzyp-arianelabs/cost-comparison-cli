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
  TokenId,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TransactionReceipt,
  TransactionRecord,
  TransactionResponse,
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
  getContract,
  parseUnits,
  PublicClient,
  TransactionReceipt as ViemTransactionReceipt,
  WalletClient,
} from 'viem';
import { get900BytesMessage } from '../../utils/utils';

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

  private async getHbarUsdPrice(): Promise<BigNumber> {
    const hbarUSDPrice = (await this.coinGeckoApiService.getHbarPriceInUsd())[
      'hedera-hashgraph'
    ].usd;
    return new BigNumber(hbarUSDPrice);
  }

  private async createTransactionResult(
    operation: SupportedOperation,
    txResponse: TransactionResponse,
    txRecord: TransactionRecord,
    txReceipt: TransactionReceipt
  ): Promise<TransactionResult> {
    const hbarPriceBN = await this.getHbarUsdPrice();
    return {
      chain: this.chainConfig.type,
      operation,
      transactionHash: txResponse.transactionId.toString(),
      gasUsed:
        txRecord.contractFunctionResult?.gasUsed.toString() ||
        txRecord.transactionFee.toString(),
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

  private async createViemTransactionResult(
    operation: SupportedOperation,
    txHash: string,
    receipt: ViemTransactionReceipt
  ): Promise<TransactionResult> {
    const hbarPriceBN = await this.getHbarUsdPrice();
    const totalCostTinybar = receipt.gasUsed * receipt.effectiveGasPrice;
    const totalCostHbar = formatUnits(BigInt(totalCostTinybar), 18);
    const usdCost = BigNumber(totalCostHbar)
      .multipliedBy(hbarPriceBN)
      .toString();

    return {
      chain: this.chainConfig.type,
      operation,
      transactionHash: txHash,
      gasUsed: receipt.gasUsed.toString(),
      totalCost: totalCostHbar,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
    };
  }

  private async createAndDeployNativeFungibleToken(
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

  private async createAndDeployNativeNonFungibleToken(
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

  /**
   * Deploy a smart contract using Hashgraph SDK
   * @param bytecode
   * @param gas
   * @param constructorParams
   * @private
   */
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

  /**
   * Execute a smart contract function using Hashgraph SDK
   * @param contractId
   * @param functionName
   * @param gas
   * @param params
   * @param maxFee
   * @private
   */
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

  /**
   * Deploy a smart contract using Viem
   * @param compiledContract
   * @param args
   * @private
   */
  private async deployViemContract(
    compiledContract: any,
    args?: any[]
  ): Promise<{
    deployHash: string;
    deployReceipt: ViemTransactionReceipt;
    contractAddress: string;
  }> {
    const deployHash = await this.viemClient.deployContract({
      abi: compiledContract.abi as Abi,
      bytecode: compiledContract.bytecode as `0x${string}`,
      account: this.viemClient.account!,
      args: args || [],
      chain: this.viemClient.chain,
    });
    console.log('deployHash', deployHash);

    const deployReceipt = await this.viemPublicClient.waitForTransactionReceipt(
      {
        hash: deployHash,
      }
    );

    return {
      deployHash,
      deployReceipt,
      contractAddress: deployReceipt.contractAddress!,
    };
  }

  // Native Fungible Token Operations
  /**
   * Key: create-native-ft
   * Steps:
   * 1. create a new token
   */
  async createNativeFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } =
      await this.createAndDeployNativeFungibleToken();
    return this.createTransactionResult(
      SupportedOperation.CREATE_NATIVE_FT,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  /**
   * key: associate-native-ft
   *  0. create account
   *  1. create a new token from an account from envs
   *  2. create a new account with limited autoassociation
   *  3. associate the new account with the token and get the tx report
   */
  async associateNativeFT(): Promise<TransactionResult> {
    // 0. create a new account
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient();

    await wait(5000);

    // 1. create a token
    const { tokenId } = await this.createAndDeployNativeFungibleToken();

    // 3. associate the new account with the token and get the tx report
    const txAssociate = new TokenAssociateTransaction()
      .setAccountId(newAccountClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const txAssociateResponse = await txAssociate.execute(newAccountClient);
    const txAssociateReceipt =
      await txAssociateResponse.getReceipt(newAccountClient);
    const txAssociateRecord =
      await txAssociateResponse.getRecord(newAccountClient);

    return this.createTransactionResult(
      SupportedOperation.ASSOCIATE_NATIVE_FT,
      txAssociateResponse,
      txAssociateRecord,
      txAssociateReceipt
    );
  }

  /**
   * Key: mint-native-ft
   * Steps:
   * 1. create new token
   * 2. mint the new token
   */
  async mintNativeFT(): Promise<TransactionResult> {
    const { tokenId } = await this.createAndDeployNativeFungibleToken();

    const tx2 = new TokenMintTransaction().setTokenId(tokenId).setAmount(1000);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    return this.createTransactionResult(
      SupportedOperation.MINT_NATIVE_FT,
      tx2Response,
      tx2Record,
      tx2Receipt
    );
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
    const { tokenId } = await this.createAndDeployNativeFungibleToken();

    // 3. transfer the token to the created account
    const tx2 = new TransferTransaction()
      .addTokenTransfer(tokenId, this.hederaClient.operatorAccountId!, -1)
      .addTokenTransfer(tokenId, newAccountClient.operatorAccountId!, 1);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    return this.createTransactionResult(
      SupportedOperation.TRANSFER_NATIVE_FT,
      tx2Response,
      tx2Record,
      tx2Receipt
    );
  }

  // Native Non Fungible Token Operation
  /**
   * key: create-native-nft
   */
  async createNativeNFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } =
      await this.createAndDeployNativeNonFungibleToken();

    return this.createTransactionResult(
      SupportedOperation.CREATE_NATIVE_NFT,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  /**
   * key: associate-native-nft
   * 0. Create a new account
   * 1. Create a NFT native token
   * 2. Associate the new account with the created NFT
   */
  async associateNativeNFT(): Promise<TransactionResult> {
    // 0. create a new account
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient();

    // 1. Create a NFT native token
    const { tokenId } = await this.createAndDeployNativeNonFungibleToken();

    // 2. Associate the new account with the created NFT
    const tx2 = new TokenAssociateTransaction()
      .setAccountId(newAccountClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const tx2Response = await tx2.execute(newAccountClient);
    const tx2Receipt = await tx2Response.getReceipt(newAccountClient);
    const tx2Record = await tx2Response.getRecord(newAccountClient);

    return this.createTransactionResult(
      SupportedOperation.ASSOCIATE_NATIVE_NFT,
      tx2Response,
      tx2Record,
      tx2Receipt
    );
  }

  /**
   * key: mint-native-nft
   * 1. Create a NFT native token
   * 2. Mint NFT
   */
  async mintNativeNFT(): Promise<TransactionResult> {
    // 1. Create a NFT native token
    const { tokenId } = await this.createAndDeployNativeNonFungibleToken();

    // 2. Mint NFT
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

    return this.createTransactionResult(
      SupportedOperation.MINT_NATIVE_NFT,
      tx2Response,
      tx2Record,
      tx2Receipt
    );
  }

  /**
   * key: transfer-native-nft
   * 0. Create a new account
   * 1. Create a new NFT
   * 2. Mint token
   * 3. Transfer token to the new account
   */
  async transferNativeNFT(): Promise<TransactionResult> {
    // 0. Create a new account
    const AUTOASSOCIATION_LIMIT = -1; // unlimited autoassociation
    const newAccountClient =
      await this.walletService.createAccountAndReturnClient(
        AUTOASSOCIATION_LIMIT
      );

    // 1. Create a new NFT
    const { tokenId } = await this.createAndDeployNativeNonFungibleToken();
    // 2. Mint token
    const tx2 = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([
        new TextEncoder().encode(
          'https://ipfs.io/ipfs/QmTW9HWfb2wsQqEVJiixkQ73Nsfp2Rx4ESaDSiQ7ThwnFM'
        ),
      ]);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const serialNumber = tx2Receipt.serials[0]!;

    // 3. Transfer token to the new account
    const tx3 = new TransferTransaction().addNftTransfer(
      new NftId(tokenId, serialNumber!),
      this.hederaClient.operatorAccountId!,
      newAccountClient.operatorAccountId!
    );

    const tx3Response = await tx3.execute(this.hederaClient);
    const tx3Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx3Record = await tx2Response.getRecord(this.hederaClient);

    return this.createTransactionResult(
      SupportedOperation.ASSOCIATE_NATIVE_NFT,
      tx3Response,
      tx3Record,
      tx3Receipt
    );
  }

  // ERC20 Hashgraph SDK Operations
  /**
   * Key: deploy-erc20-sdk
   * 2. Deploy a precompiled ERC20 contract
   */
  async createERC20_SDK(): Promise<TransactionResult> {
    // 1. Deploy a precompiled ERC20 contract
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { txResponse, txRecord, txReceipt } = await this.deployContract(
      erc20Compiled.bytecode,
      1095808,
      constructorParams
    );

    return this.createTransactionResult(
      SupportedOperation.CREATE_ERC20_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
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
    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { contractId } = await this.deployContract(
      erc20Compiled.bytecode,
      1095808,
      constructorParams
    );

    // 2. Call mint function on the contract
    const mintParams = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(10000); // mint amount

    const { txResponse, txRecord, txReceipt } =
      await this.executeContractFunction(
        contractId,
        'mint',
        100388,
        mintParams
      );

    return this.createTransactionResult(
      SupportedOperation.MINT_ERC20_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
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
    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { contractId } = await this.deployContract(
      erc20Compiled.bytecode,
      1095808,
      constructorParams
    );

    // 2. Mint some tokens
    const mintParams = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(1000); // mint amount

    await this.executeContractFunction(contractId, 'mint', 100388, mintParams);

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
    const transferParams = new ContractFunctionParameters()
      .addAddress(EvmAddress.fromString(recipientEVMAddress))
      .addUint256(100); // transfer amount

    const { txResponse, txRecord, txReceipt } =
      await this.executeContractFunction(
        contractId,
        'transfer',
        56311,
        transferParams
      );

    return this.createTransactionResult(
      SupportedOperation.TRANSFER_ERC20_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  // ERC721 Hashgraph SDK Operations
  /**
   * Key: deploy-erc721-sdk
   * 1. Deploy ERC721 contract
   */
  async createERC721_SDK(): Promise<TransactionResult> {
    // 1. Deploy ERC721 contract
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { txResponse, txRecord, txReceipt } = await this.deployContract(
      erc721Compiled.bytecode,
      2095808,
      constructorParams
    );

    return this.createTransactionResult(
      SupportedOperation.CREATE_ERC721_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  /**
   * Key: mint-erc721-sdk
   * 1. Deploy a precompiled ERC721 contract
   * 2. Mint ERC721
   */
  async mintERC721_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC721 contract
    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { contractId } = await this.deployContract(
      erc721Compiled.bytecode,
      2095808,
      constructorParams
    );

    // 2. Call safeMint function on the contract
    const mintParams = new ContractFunctionParameters().addAddress(evmAddress);
    const { txResponse, txRecord, txReceipt } =
      await this.executeContractFunction(
        contractId,
        'safeMint',
        2095808,
        mintParams
      );

    return this.createTransactionResult(
      SupportedOperation.MINT_ERC721_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  /**
   * Key: transfer-erc721-sdk
   * 1. Deploy ERC721 contract
   * 2. Mint NFT
   * 3. Create a recipient account
   * 4. Call transferFrom function on the contract
   */
  async transferERC721_SDK(): Promise<TransactionResult> {
    const evmAddress = await getEvmCompatibleAddress(
      this.hederaMirrorNodeService,
      this.hederaClient.operatorAccountId!
    );

    // 1. Deploy ERC721 contract
    const constructorParams = new ContractFunctionParameters().addAddress(
      evmAddress
    );
    const { contractId } = await this.deployContract(
      erc721Compiled.bytecode,
      2095808,
      constructorParams
    );

    // 2. Mint an NFT
    const mintParams = new ContractFunctionParameters().addAddress(evmAddress);

    await this.executeContractFunction(
      contractId,
      'safeMint',
      2095808,
      mintParams
    );

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
    const tokenId = 0; // The first minted token will have ID 0
    const transferParams = new ContractFunctionParameters()
      .addAddress(evmAddress) // from
      .addAddress(EvmAddress.fromString(recipientEVMAddress)) // to
      .addUint256(tokenId); // tokenId
    const { txResponse, txRecord, txReceipt } =
      await this.executeContractFunction(
        contractId,
        'transferFrom',
        2095808,
        transferParams
      );

    return this.createTransactionResult(
      SupportedOperation.TRANSFER_ERC721_SDK,
      txResponse,
      txRecord,
      txReceipt
    );
  }

  // ERC20 RPC Operations with viem client
  /**
   * key: deploy-erc20-hardhat
   * 1. Deploy ERC20 precompiled contract with use of viem
   */
  async createERC20_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemClient.account!.address;
    const { deployReceipt, deployHash } = await this.deployViemContract(
      erc20Compiled,
      [initialOwner]
    );

    return this.createViemTransactionResult(
      SupportedOperation.CREATE_ERC20_HARDHAT,
      deployHash,
      deployReceipt
    );
  }

  /**
   * key: mint-erc20-hardhat
   * 1. Deploy ERC20 precompiled contract with use of viem
   * 2. Mint ERC20 tokens
   */
  async mintERC20_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemClient.account!.address;
    const { deployReceipt } = await this.deployViemContract(erc20Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: {
        public: this.viemPublicClient,
        wallet: this.viemClient,
      },
    });

    const mintAmount = parseUnits('100', 18); // 100 tokens

    if (!contract.write || !contract.write.mint) {
      throw new Error(
        'Contract write method unavailable – check you passed walletClient and ABI.'
      );
    }
    const mintTxHash = await contract.write.mint([initialOwner, mintAmount]);

    const mintReceipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    return this.createViemTransactionResult(
      SupportedOperation.MINT_ERC20_HARDHAT,
      mintTxHash,
      mintReceipt
    );
  }

  /**
   * key: transfer-erc20-hardhat
   * 0. create account
   * 1. Deploy a precompiled ERC20 smart contract with viem
   * 2. Mint ERC20
   * 3. Transfer ERC20 to the created account
   */
  async transferERC20_RPC(): Promise<TransactionResult> {
    // 0. create account
    const recipient = (await this.evmWalletService.createAccount())
      .accountAddress;
    const initialOwner = this.viemClient.account!.address;

    // 1. Deploy a precompiled ERC20 smart contract with viem
    const { deployReceipt } = await this.deployViemContract(erc20Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: this.viemClient,
    });

    // 2. Mint ERC20
    const mintAmount = parseUnits('100', 18); // 100 tokens
    // @ts-ignore
    const mintTxHash = await contract.write.mint([initialOwner, mintAmount])!;

    await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintTxHash,
    });

    // 3. Transfer ERC20 to the created account
    const transferAmount = parseUnits('10', 18); // 10 tokens
    // @ts-ignore
    const transferHash = await contract.write.transfer([
      recipient,
      transferAmount,
    ]);

    const transferReceipt =
      await this.viemPublicClient.waitForTransactionReceipt({
        hash: transferHash,
      });

    return this.createViemTransactionResult(
      SupportedOperation.TRANSFER_ERC20_HARDHAT,
      transferHash,
      transferReceipt
    );
  }

  // ERC721 RPC Operations with viem client
  /**
   * key: deploy-erc721-hardhat
   * 1. Deploy precompiled ERC721 contract with use of viem
   */
  async createERC721_RPC(): Promise<TransactionResult> {
    console.log('deploying ERC721');
    const initialOwner = this.viemClient.account!.address;
    const { deployReceipt, deployHash } = await this.deployViemContract(
      erc721Compiled,
      [initialOwner]
    );

    console.log('deploying ERC721 - CONTRACT DEPLOYED');

    return this.createViemTransactionResult(
      SupportedOperation.CREATE_ERC721_HARDHAT,
      deployHash,
      deployReceipt
    );
  }

  /**
   * key: mint-erc721-hardhat
   * 1. deploy a precompiled ERC721 smart contract with viem
   * 2. Mint ERC721
   */
  async mintERC721_RPC(): Promise<TransactionResult> {
    console.log('minting ERC721');
    const initialOwner = this.viemClient.account!.address;
    const { deployReceipt } = await this.deployViemContract(erc721Compiled, [
      initialOwner,
    ]);

    console.log('minting ERC721 - CONTRACT DEPLOYED');

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemClient,
    });

    // Mint NFT to the initial owner
    // @ts-ignore
    const mintHash = await contract.write.safeMint([initialOwner])!;

    const mintReceipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintHash,
    });

    console.log('minting ERC721 - mintReceipt');

    return this.createViemTransactionResult(
      SupportedOperation.MINT_ERC721_HARDHAT,
      mintHash,
      mintReceipt
    );
  }

  /**
   * Key: transfer-erc721-hardhat
   * 0. Create an account that will receive the ERC721
   * 1. Deploy a precompiled ERC721 contract with the use of viem
   * 2. Mint ERC721
   * 3. Transfer ERC721 to a created account
   */
  async transferERC721_RPC(): Promise<TransactionResult> {
    // 0. Create an account that will receive the ERC721
    const recipient = (await this.evmWalletService.createAccount())
      .accountAddress;
    const initialOwner = this.viemClient.account!.address;

    // 1. deploy a precompiled ERC721 contract
    const { deployReceipt } = await this.deployViemContract(erc721Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemClient,
    });

    // 2. Mint ERC721
    // @ts-ignore
    const mintHash = await contract.write.safeMint([initialOwner])!;

    await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintHash,
    });

    // Get the token ID from the mint transaction logs
    // Token ID 0 will be the first minted token based on the contract logic
    const tokenId = 0;

    // 3. Transfer ERC721 to a created account
    // @ts-ignore
    const transferHash = await contract.write.transferFrom([
      initialOwner,
      recipient,
      tokenId,
    ]);

    const transferReceipt =
      await this.viemPublicClient.waitForTransactionReceipt({
        hash: transferHash,
      });

    return this.createViemTransactionResult(
      SupportedOperation.TRANSFER_ERC721_HARDHAT,
      transferHash,
      transferReceipt
    );
  }

  /**
   * key: hcs-message-submit
   * 1. Create a topic.
   * 2. Submit a 900-bytes long message to the topic.
   */
  async hcsSubmitMessage(): Promise<TransactionResult> {
    const txTopicCreate = new TopicCreateTransaction()
      .setAdminKey(this.hederaClient.operatorPublicKey!)
      .setSubmitKey(this.hederaClient.operatorPublicKey!);

    const txResponse = await txTopicCreate.execute(this.hederaClient);
    const txRecord = await txResponse.getRecord(this.hederaClient);
    const topicId = txRecord.receipt.topicId!;

    const txSubmitMessage = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(get900BytesMessage());

    const txSubmitResponse = await txSubmitMessage.execute(this.hederaClient);
    const txSubmitReceipt = await txSubmitResponse.getReceipt(
      this.hederaClient
    );
    const txSubmitRecord = await txSubmitResponse.getRecord(this.hederaClient);

    return this.createTransactionResult(
      SupportedOperation.HCS_MESSAGE_SUBMIT,
      txSubmitResponse,
      txSubmitRecord,
      txSubmitReceipt
    );
  }
}
