import {
  AccountCreateTransaction,
  AccountId,
  AccountInfoQuery,
  Client,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  EvmAddress,
  Hbar,
  NftId,
  PrivateKey,
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
import { INativeHederaSdkOperations } from './IHederaNativeOperations';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { NetworkType, SupportedChain, TransactionResult } from '../../types';
import { getEvmCompatibleAddress } from './hederaUtils';
import { HederaMirrorNodeService } from '../../services/ApiService/HederaMirrorNodeService';
import erc20Compiled from '../../contracts/ERC-20.json';
import { get900BytesMessage, wait } from '../../utils/utils';
import erc721Compiled from '../../contracts/ERC-721.json';

export class HederaNativeOperations implements INativeHederaSdkOperations {
  private configService: ConfigService;
  private hederaClient: Client;
  private hederaMirrorNodeService: HederaMirrorNodeService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    const networkType = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).networkType!;
    const privateKey = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).privateKey!;
    const accountId = this.configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).address!;
    this.hederaClient = this.createClient(networkType, accountId, privateKey);
    this.hederaMirrorNodeService = new HederaMirrorNodeService(configService);
  }

  // Helper method to format the transaction results
  private async formatTransactionResult(
    txResponse: TransactionResponse,
    txRecord: TransactionRecord,
    txReceipt: TransactionReceipt
  ): Promise<TransactionResult> {
    return {
      transactionHash: txResponse.transactionId.toString(),
      gasUsedL1:
        txRecord.contractFunctionResult?.gasUsed.toString() ||
        txRecord.transactionFee.toString(),
      totalCost: txRecord.transactionFee.toBigNumber().toString(),
      timestamp: txRecord.consensusTimestamp.toString(),
      status: txReceipt.status === Status.Success ? 'success' : 'failed',
    };
  }

  // Helper method to deploy a native FT HTS token
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

  // Helper method to deploy a native NFT HTS token
  public async createNFT(
    tokenName: string = 'Your NFT Name',
    tokenSymbol: string = 'NFT',
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

  // Helper method to deploy contracts
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

  // Helper method to execute contract functions
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

  // Helper method to create new accounts in tests
  public async createAccountAndReturnClient(
    autoAssociation?: number
  ): Promise<Client> {
    const accountPrivateKey = PrivateKey.generateECDSA();
    const accountPublicKey = accountPrivateKey.publicKey;

    const tx = new AccountCreateTransaction()
      .setKey(accountPublicKey)
      .setInitialBalance(new Hbar(10)) // 10 HBARs will be sent from the connected account to the newly created one
      .setMaxAutomaticTokenAssociations(autoAssociation || 0); // If not set, then no auto association. To set unlimited pass -1

    const txResponse = await tx.execute(this.hederaClient);
    const receipt = await txResponse.getReceipt(this.hederaClient);

    if (!receipt.status.toString().includes('SUCCESS'))
      throw new Error('Account creation failed');

    return this.createClient(
      this.configService.getWalletCredentials(SupportedChain.HEDERA)
        .networkType!,
      receipt.accountId?.toString()!,
      accountPrivateKey.toStringDer()
    );
  }

  // Helper method to create a client out of account data
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

  /**
   * Key: create-native-ft
   * Steps:
   * 1. create a new token
   */
  async createNativeFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } = await this.createFT();
    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
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
    const newAccountClient = await this.createAccountAndReturnClient();

    await wait(5000);

    // 1. create a token
    const { tokenId } = await this.createFT();

    // 3. associate the new account with the token and get the tx report
    const txAssociate = new TokenAssociateTransaction()
      .setAccountId(newAccountClient.operatorAccountId!)
      .setTokenIds([tokenId]); //Fill in the token ID

    const txAssociateResponse = await txAssociate.execute(newAccountClient);
    const txAssociateReceipt =
      await txAssociateResponse.getReceipt(newAccountClient);
    const txAssociateRecord =
      await txAssociateResponse.getRecord(newAccountClient);

    return this.formatTransactionResult(
      txAssociateResponse,
      txAssociateRecord,
      txAssociateReceipt
    );
  }

  /**
   * key: create-native-nft
   */
  async createNativeNFT(): Promise<TransactionResult> {
    const { txResponse, txReceipt, txRecord } = await this.createNFT();
    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
  }

  /**
   * key: associate-native-nft
   * 0. Create a new account
   * 1. Create a NFT native token
   * 2. Associate the new account with the created NFT
   */
  async associateNativeNFT(): Promise<TransactionResult> {
    // 0. create a new account
    const newAccountClient = await this.createAccountAndReturnClient();

    await wait(5000);

    // 1. Create a NFT native token
    const { tokenId } = await this.createNFT();

    // 2. Associate the new account with the created NFT
    const tx = new TokenAssociateTransaction()
      .setAccountId(newAccountClient.operatorAccountId!)
      .setTokenIds([tokenId]);

    const txResponse = await tx.execute(newAccountClient);
    const txReceipt = await txResponse.getReceipt(newAccountClient);
    const txRecord = await txResponse.getRecord(newAccountClient);

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
  }

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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
  }

  /**
   * Key: deploy-erc721-sdk
   * 1. Deploy ERC721 contract
   */
  async createERC721_SDK(): Promise<TransactionResult> {
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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
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

    return this.formatTransactionResult(
      txSubmitResponse,
      txSubmitRecord,
      txSubmitReceipt
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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
  }

  /**
   * Key: mint-native-ft
   * Steps:
   * 1. create new token
   * 2. mint the new token
   */
  async mintNativeFT(): Promise<TransactionResult> {
    const { tokenId } = await this.createFT();

    const tx2 = new TokenMintTransaction().setTokenId(tokenId).setAmount(1000);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    return this.formatTransactionResult(tx2Response, tx2Record, tx2Receipt);
  }

  /**
   * key: mint-native-nft
   * 1. Create a NFT native token
   * 2. Mint NFT
   */
  async mintNativeNFT(): Promise<TransactionResult> {
    // 1. Create a NFT native token
    const { tokenId } = await this.createNFT();

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

    return this.formatTransactionResult(tx2Response, tx2Record, tx2Receipt);
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
    const recipientClient = await this.createAccountAndReturnClient();

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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
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
    const recipientClient = await this.createAccountAndReturnClient();

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

    return this.formatTransactionResult(txResponse, txRecord, txReceipt);
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
    const newAccountClient = await this.createAccountAndReturnClient(
      AUTOASSOCIATION_LIMIT
    );

    // 2. create a token from the newly crated account
    const { tokenId } = await this.createFT();

    // 3. transfer the token to the created account
    const tx2 = new TransferTransaction()
      .addTokenTransfer(tokenId, this.hederaClient.operatorAccountId!, -1)
      .addTokenTransfer(tokenId, newAccountClient.operatorAccountId!, 1);

    const tx2Response = await tx2.execute(this.hederaClient);
    const tx2Receipt = await tx2Response.getReceipt(this.hederaClient);
    const tx2Record = await tx2Response.getRecord(this.hederaClient);

    return this.formatTransactionResult(tx2Response, tx2Record, tx2Receipt);
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
    const newAccountClient = await this.createAccountAndReturnClient(
      AUTOASSOCIATION_LIMIT
    );

    // 1. Create a new NFT
    const { tokenId } = await this.createNFT();
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

    return this.formatTransactionResult(tx3Response, tx3Record, tx3Receipt);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const _accountInfo = await new AccountInfoQuery()
        .setAccountId(this.hederaClient.operatorAccountId!)
        .execute(this.hederaClient);
      return Promise.resolve(true);
    } catch (error) {
      return Promise.resolve(false);
    }
  }
}
