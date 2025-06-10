export interface TransactionResult {
  chain: string;
  operation: string;
  transactionHash: string;
  gasUsed: string;
  gasPrice: string;
  totalCost: string;
  nativeCurrencySymbol: string;
  usdCost?: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  blockNumber?: string;
  confirmations?: number;
}

export enum SupportedChain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
  HEDERA = 'hedera',
  SOLANA = 'solana',
}

export enum SupportedMethod {
  CREATE_NATIVE_FT = 'create-native-ft',
  CREATE_NATIVE_NFT = 'create-native-nft',
  CREATE_ERC20 = 'create-erc20',
  CREATE_ERC721 = 'create-erc721',
}

export interface WalletCredentials {
  privateKey?: string;
}

export interface ChainConfig {
  id: string;
  name: string;
  type: 'evm' | 'hedera' | 'solana' | 'other';
  rpcUrl?: string;
  networkId?: string;
  nativeCurrency: string;
  explorerUrl: string;
}
