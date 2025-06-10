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
  TRANSFER_NATIVE_FT = 'transfer-native-ft',
  DEPLOY_ERC20 = 'deploy-erc20',
  TRANSFER_ERC20 = 'transfer-erc20',
  DEPLOY_ERC721 = 'deploy-erc721',
  MINT_ERC721 = 'mint-erc721',
  SMART_CONTRACT_CALL = 'contract-call',
  TOKEN_SWAP = 'swap'
}