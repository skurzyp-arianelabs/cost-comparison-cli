import { ExtendedChain, SupportedChain } from '../../types';
import { ConfigService } from '../ConfigService/ConfigService';
import { PrivateKey } from '@hashgraph/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  Abi,
  createNonceManager,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  TransactionReceipt as ViemTransactionReceipt,
  getContract,
  parseUnits,
} from 'viem';
import { jsonRpc } from 'viem/nonce';
import erc20Compiled from '../../contracts/ERC-20.json';

export class HederaEvmWalletService {
  private viemWalletClient: WalletClient;
  private viemPublicClient: PublicClient;
  private chain: ExtendedChain;
  private supportedChain: SupportedChain;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.supportedChain = SupportedChain.HEDERA;
    this.chain = this.configService.getChainConfig(this.supportedChain);
    this.viemWalletClient = this.initWalletClient(configService);
    this.viemPublicClient = this.initPublicClient(configService);
  }

  private parseDerKeyToHex(derKey: string): `0x${string}` {
    const der = PrivateKey.fromStringDer(derKey);
    const raw = der.toBytesRaw();

    const hex = Buffer.from(raw).toString('hex').padStart(64, '0');
    return `0x${hex}`;
  }

  initPublicClient(configService: ConfigService): PublicClient {
    const chainConfig = configService.getChainConfig(SupportedChain.HEDERA);

    return createPublicClient({
      chain: chainConfig, // TODO: should get explicitly Chain form viem
      transport: http(chainConfig.rpcUrls.default.http[0]!),
    });
  }

  initWalletClient(configService: ConfigService): WalletClient {
    const privateKey = configService.getWalletCredentials(
      SupportedChain.HEDERA
    ).privateKey!;

    const hexPrivateKey = this.parseDerKeyToHex(privateKey);

    const account = privateKeyToAccount(hexPrivateKey as `0x${string}`, {
      nonceManager: createNonceManager({
        source: jsonRpc(),
      }),
    });

    return createWalletClient({
      account,
      chain: this.chain, // TODO: should get explicitly Chain form viem
      transport: http(this.chain.rpcUrls.default.http[0]!),
    });
  }

  createNewAccountAndReturnWalletClient(
    configService: ConfigService
  ): WalletClient {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey as `0x${string}`, {
      nonceManager: createNonceManager({
        source: jsonRpc(),
      }),
    });

    return createWalletClient({
      account,
      chain: this.chain, // TODO: should get explicitly Chain form viem
      transport: http(this.chain.rpcUrls.default.http[0]!),
    });
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

  async createERC20_RPC(): Promise<{
    txHash: string;
    receipt: ViemTransactionReceipt;
  }> {
    const initialOwner = this.viemWalletClient.account!.address;
    const { deployReceipt, deployHash } = await this.deployViemContract(
      erc20Compiled,
      [initialOwner]
    );

    return { txHash: deployHash, receipt: deployReceipt };
  }

  async mintERC20_RPC(): Promise<{
    txHash: string;
    receipt: ViemTransactionReceipt;
  }> {
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
    return { txHash: mintTxHash, receipt: mintReceipt };
  }
}
