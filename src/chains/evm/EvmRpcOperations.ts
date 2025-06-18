import {
  Abi,
  createNonceManager,
  createPublicClient,
  createWalletClient,
  formatUnits,
  getContract,
  http,
  parseUnits,
  PublicClient, stringToHex,
  TransactionReceipt as ViemTransactionReceipt,
  WalletClient,
} from 'viem';
import { IEvmRpcOperations } from './IEvmRpcOperations';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { AccountData, TransactionResult } from '../../types';
import { jsonRpc } from 'viem/nonce';
import erc20Compiled from '../../contracts/ERC-20.json';
import erc721Compiled from '../../contracts/ERC-721.json';
import { get900BytesMessage } from '../../utils/utils';

export class EvmRpcOperations implements IEvmRpcOperations {
  private viemWalletClient: WalletClient;
  private viemPublicClient: PublicClient;

  constructor(rpcUrl: string, privateKey: `0x${string}`) {
    this.viemPublicClient = createPublicClient({ transport: http(rpcUrl) });
    const account = privateKeyToAccount(privateKey as `0x${string}`, {
      nonceManager: createNonceManager({
        source: jsonRpc(),
      }),
    });
    this.viemWalletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    });
  }

  private formatViemTransactionResult(
    txHash: string,
    receipt: ViemTransactionReceipt,
    additionalCost: bigint = 0n,
  ): TransactionResult {
    const totalCostWei = receipt.gasUsed * receipt.effectiveGasPrice + additionalCost;
    const totalCostEth = formatUnits(BigInt(totalCostWei), 18);
    return {
      transactionHash: txHash,
      gasUsedL1: receipt.gasUsed.toString(),
      gasPriceL1: receipt.effectiveGasPrice.toString(),
      totalCost: totalCostEth.toString(),
      timestamp: Date.now().toString(),
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
    };
  }

  private async deployViemContract(
    compiledContract: any,
    args?: any[]
  ): Promise<{
    deployHash: string;
    deployReceipt: ViemTransactionReceipt;
    contractAddress: string;
  }> {
    const deployHash = await this.viemWalletClient.deployContract({
      abi: compiledContract.abi as Abi,
      bytecode: compiledContract.bytecode as `0x${string}`,
      account: this.viemWalletClient.account!,
      args: args || [],
      chain: this.viemWalletClient.chain,
    });

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

  public async createAccount(): Promise<AccountData> {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey as `0x${string}`, {
      nonceManager: createNonceManager({
        source: jsonRpc(),
      }),
    });

    return {
      accountAddress: account.address,
      privateKey: privateKey,
      publicKey: `0x${account.publicKey.slice(4)}`, // Remove '0x04' prefix from uncompressed public key
    };
  }

  /**
   * key: deploy-erc20-hardhat
   * 1. Deploy ERC20 precompiled contract with use of viem
   */
  async createERC20_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemWalletClient.account!.address;

    const { deployHash, deployReceipt } = await this.deployViemContract(
      erc20Compiled,
      [initialOwner]
    );

    return this.formatViemTransactionResult(deployHash, deployReceipt);
  }

  /**
   * key: mint-erc20-hardhat
   * 1. Deploy ERC20 precompiled contract with use of viem
   * 2. Mint ERC20 tokens
   */
  async mintERC20_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemWalletClient.account!.address;

    const { deployReceipt } = await this.deployViemContract(erc20Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: {
        public: this.viemPublicClient,
        wallet: this.viemWalletClient,
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

    return this.formatViemTransactionResult(mintTxHash, mintReceipt);
  }

  /**
   * key: deploy-erc721-hardhat
   * 1. Deploy precompiled ERC721 contract with use of viem
   */
  async createERC721_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemWalletClient.account!.address;
    const { deployReceipt, deployHash } = await this.deployViemContract(
      erc721Compiled,
      [initialOwner]
    );

    return this.formatViemTransactionResult(deployHash, deployReceipt);
  }

  /**
   * key: mint-erc721-hardhat
   * 1. deploy a precompiled ERC721 smart contract with viem
   * 2. Mint ERC721
   */
  async mintERC721_RPC(): Promise<TransactionResult> {
    const initialOwner = this.viemWalletClient.account!.address;
    const { deployReceipt } = await this.deployViemContract(erc721Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemWalletClient,
    });

    // Mint NFT to the initial owner
    // @ts-ignore
    const mintHash = await contract.write.safeMint([initialOwner])!;

    const mintReceipt = await this.viemPublicClient.waitForTransactionReceipt({
      hash: mintHash,
    });

    return this.formatViemTransactionResult(mintHash, mintReceipt);
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
    const recipient = (await this.createAccount()).accountAddress;
    const initialOwner = this.viemWalletClient.account!.address;

    // 1. Deploy a precompiled ERC20 smart contract with viem
    const { deployReceipt } = await this.deployViemContract(erc20Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc20Compiled.abi as Abi,
      client: this.viemWalletClient,
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

    return this.formatViemTransactionResult(transferHash, transferReceipt);
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
    const recipient = (await this.createAccount()).accountAddress;
    const initialOwner = this.viemWalletClient.account!.address;

    // 1. deploy a precompiled ERC721 contract
    const { deployReceipt } = await this.deployViemContract(erc721Compiled, [
      initialOwner,
    ]);

    const contract = getContract({
      address: deployReceipt.contractAddress!,
      abi: erc721Compiled.abi as Abi,
      client: this.viemWalletClient,
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

    return this.formatViemTransactionResult(transferHash, transferReceipt);
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Try fetching the latest block number to check connection
      const _blockNumber = await this.viemPublicClient.getBlockNumber();
      return Promise.resolve(true);
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  /**
   * Key: hcs-message-submit
   * Sending a message is handled as attaching the text to transfer transaction memo
   * 0. Create an account that will receive transaction
   * 1. Send transaction with an attached message
   */
  async submitMessage(): Promise<TransactionResult> {
    // 0. Create an account that will receive the message
    const recipient = (await this.createAccount())
      .accountAddress;
    const memoText = get900BytesMessage();

    // 1. place the transaction with an attached message
    const transferHash = await this.viemWalletClient.sendTransaction({
      account: this.viemWalletClient.account!,
      to: recipient as `0x${string}`,
      value: 1n,
      data: stringToHex(memoText),
      chain: this.viemWalletClient.chain,
    });

    const transferReceipt =
      await this.viemPublicClient.waitForTransactionReceipt({
        hash: transferHash,
      });

    // the additional cost of transferred tokens must be taken into account
    return this.formatViemTransactionResult(
      transferHash,
      transferReceipt,
      1n
    );
  }
}
