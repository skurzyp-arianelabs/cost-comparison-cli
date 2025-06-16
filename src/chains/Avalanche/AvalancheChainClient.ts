import { AbstractChainClient } from '../abstract/AbstractChainClient';
import { EvmWalletService } from '../../services/WalletServices/EvmWalletService';
import {
  ExtendedChain,
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../../types';
import { ConfigService } from '../../services/ConfigService/ConfigService';
import { BigNumber } from 'bignumber.js';
import {
  Abi,
  formatUnits,
  getContract,
  parseUnits,
  PublicClient,
  stringToHex,
  TransactionReceipt as ViemTransactionReceipt,
  WalletClient,
} from 'viem';
import erc20Compiled from './contracts/ERC-20.json';
import erc721Compiled from './contracts/ERC-721.json';
import { get900BytesMessage } from '../../utils/utils';

export class AvalancheChainClient extends AbstractChainClient {
  private readonly evmWalletService: EvmWalletService;
  private readonly viemClient: WalletClient;
  private readonly viemPublicClient: PublicClient;

  constructor(chainConfig: ExtendedChain, configService: ConfigService) {
    super(chainConfig, configService);
    this.evmWalletService = new EvmWalletService(
      configService,
      SupportedChain.AVALANCHE
    );
    this.viemClient = this.evmWalletService.getClient();
    this.viemPublicClient = this.evmWalletService.getPublicClient();
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Try fetching the latest block number to check connection
      this.viemPublicClient.getBlockNumber();
      return true;
    } catch (error) {
      console.error('Avalanche client health check failed:', error);
      return false;
    }
  }

  private async getAvaxUsdPrice(): Promise<BigNumber> {
    const avaxUSDPrice = (await this.coinGeckoApiService.getAvaxPriceInUsd())[
      'avalanche-2'
    ].usd;
    return new BigNumber(avaxUSDPrice);
  }

  private async createViemTransactionResult(
    operation: SupportedOperation,
    txHash: string,
    receipt: ViemTransactionReceipt
  ): Promise<TransactionResult> {
    const avaxPriceBN = await this.getAvaxUsdPrice();
    const totalCostNavax = receipt.gasUsed * receipt.effectiveGasPrice;
    const totalCostAvax = formatUnits(BigInt(totalCostNavax), 18);
    const usdCost = BigNumber(totalCostAvax)
      .multipliedBy(avaxPriceBN)
      .toString();

    return {
      chain: this.chainConfig.type,
      operation,
      transactionHash: txHash,
      gasUsed: receipt.gasUsed.toString(),
      totalCost: totalCostAvax,
      nativeCurrencySymbol: this.chainConfig.nativeCurrency.symbol,
      usdCost,
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
    };
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
  async createNativeFT(): Promise<TransactionResult> {
    return this.createERC20_RPC();
  }

  async associateNativeFT(): Promise<TransactionResult> {
    throw new Error(`Method not supported for: ${this.chainConfig.name}`);
  }

  async mintNativeFT(): Promise<TransactionResult> {
    return this.mintERC20_RPC();
  }

  async transferNativeFT(): Promise<TransactionResult> {
    return this.transferERC20_RPC();
  }

  async createNativeNFT(): Promise<TransactionResult> {
    return this.createERC721_RPC();
  }

  async associateNativeNFT(): Promise<TransactionResult> {
    throw new Error(`Method not supported for: ${this.chainConfig.name}`);
  }

  async mintNativeNFT(): Promise<TransactionResult> {
    return this.mintERC721_RPC();
  }

  async transferNativeNFT(): Promise<TransactionResult> {
    return this.transferERC721_RPC();
  }

  async createERC20_SDK(): Promise<TransactionResult> {
    return this.createERC20_RPC();
  }

  async mintERC20_SDK(): Promise<TransactionResult> {
    return this.mintERC20_RPC();
  }

  async transferERC20_SDK(): Promise<TransactionResult> {
    return this.transferERC20_RPC();
  }

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
    // 0. create an account
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

  async createERC721_SDK(): Promise<TransactionResult> {
    return this.createERC721_RPC();
  }

  async mintERC721_SDK(): Promise<TransactionResult> {
    return this.mintERC721_RPC();
  }

  async transferERC721_SDK(): Promise<TransactionResult> {
    return this.transferERC721_RPC();
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
   * Key: hcs-message-submit
   * Sending a message is handled as attaching the text to transfer transaction memo
   * 0. Create an account that will receive transaction
   * 1. Send transaction with an attached message
   */
  async hcsSubmitMessage(): Promise<TransactionResult> {
    // 0. Create an account that will receive the message
    const recipient = (await this.evmWalletService.createAccount())
      .accountAddress;
    const memoText = get900BytesMessage();

    // 1. place the transaction with an attached message
    const transferHash = await this.viemClient.sendTransaction({
      account: this.viemClient.account!,
      to: recipient as `0x${string}`,
      value: 1n,
      data: stringToHex(memoText),
      chain: this.viemClient.chain!,
    });

    const transferReceipt =
      await this.viemPublicClient.waitForTransactionReceipt({
        hash: transferHash,
      });

    return this.createViemTransactionResult(
      SupportedOperation.HCS_MESSAGE_SUBMIT,
      transferHash,
      transferReceipt
    );
  }
}
