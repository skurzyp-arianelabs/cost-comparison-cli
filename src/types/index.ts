import { Chain } from 'viem';

export interface TransactionResult {
  chain: SupportedChain;
  operation: SupportedOperation;
  transactionHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  totalCost?: string;
  nativeCurrencySymbol?: string;
  usdCost?: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  blockNumber?: string;
  confirmations?: number;
}

export enum SupportedChain {
  AVALANCHE = 'avalanche',
  HEDERA = 'hedera',
  SOLANA = 'solana',
  RIPPLE = 'ripple',
  STELLAR = 'stellar',
  OPTIMISM = 'optimism',
}

export interface WalletCredentials {
  privateKey?: string;
  address?: string;
  networkType?: NetworkType;
}

export interface ChainConfig {
  id: string;
  name: string;
  type: SupportedChain;
  rpcUrl?: string;
  networkId?: string;
  nativeCurrency: string;
  explorerUrl: string;
  decimals: number;
}

// TODO: align with the required operations
export enum SupportedOperation {
  // Native Tokens - Fungible
  CREATE_NATIVE_FT = 'create-native-ft',
  ASSOCIATE_NATIVE_FT = 'associate-native-ft',
  MINT_NATIVE_FT = 'mint-native-ft',
  TRANSFER_NATIVE_FT = 'transfer-native-ft',

  // Native Tokens - Non Fungible
  CREATE_NATIVE_NFT = 'create-native-nft',
  ASSOCIATE_NATIVE_NFT = 'associate-native-nft',
  MINT_NATIVE_NFT = 'mint-native-nft',
  TRANSFER_NATIVE_NFT = 'transfer-native-nft',

  // ERC20 Smart Contracts (Hardhat JSON RPC)
  CREATE_ERC20_HARDHAT = 'deploy-erc20-hardhat',
  MINT_ERC20_HARDHAT = 'mint-erc20-hardhat',
  TRANSFER_ERC20_HARDHAT = 'transfer-erc20-hardhat',

  // ERC20 Smart Contracts (SDK)
  CREATE_ERC20_SDK = 'deploy-erc20-sdk',
  MINT_ERC20_SDK = 'mint-erc20-sdk',
  TRANSFER_ERC20_SDK = 'transfer-erc20-sdk',

  // ERC721 Smart Contracts (Hardhat JSON RPC)
  CREATE_ERC721_HARDHAT = 'deploy-erc721-hardhat',
  MINT_ERC721_HARDHAT = 'mint-erc721-hardhat',
  TRANSFER_ERC721_HARDHAT = 'transfer-erc721-hardhat',

  // ERC721 Smart Contracts (SDK)
  CREATE_ERC721_SDK = 'deploy-erc721-sdk',
  MINT_ERC721_SDK = 'mint-erc721-sdk',
  TRANSFER_ERC721_SDK = 'transfer-erc721-sdk',

  // HCS
  HCS_MESSAGE_SUBMIT = 'hcs-message-submit',
}

export enum NetworkType {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
  PREVIEWNET = 'previewnet',
}

export type AccountData = {
  accountAddress: string;
  privateKey: string;
  publicKey: string;
};

export interface ExtendedChain extends Chain {
  type: SupportedChain;
  network: NetworkType;
}
