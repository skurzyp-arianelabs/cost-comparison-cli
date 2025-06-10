export interface TransactionResult {
  chain: string;
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
}

export interface ChainConfig {
  id: string;
  name: string;
  type: SupportedChain;
  rpcUrl?: string;
  networkId?: string;
  nativeCurrency: string;
  explorerUrl: string;
}

// TODO: align with the required operations
export enum SupportedOperation {
  NATIVE_TRANSFER = 'nativeFT',
  DEPLOY_ERC20 = 'erc20',
  TRANSFER_ERC20 = 'erc20transfer',
  DEPLOY_ERC721 = 'erc721',
  MINT_ERC721 = 'erc721mint',
  SMART_CONTRACT_CALL = 'contract',
  TOKEN_SWAP = 'swap'
}