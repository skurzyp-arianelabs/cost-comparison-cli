export interface FullTransactionResult extends TransactionResult {
  chain: SupportedChain;
  operation: SupportedOperation;
  nativeCurrencySymbol?: string;
  usdCost?: string;
  timestamp: string;
  confirmations?: number;
}

export interface TransactionResult {
  transactionHash?: string;
  gasUsed?: string | undefined;
  gasPrice?: string | undefined;
  gasUsedL1?: string | undefined;
  gasPriceL1?: string | undefined;
  feeL1?: string | undefined;
  totalCost?: string | undefined;
  status: 'success' | 'failed' | 'not_applicable';
  timestamp: string;
  error?: string | undefined;
  blockNumber?: string;
  additionalCost?: string;
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

export interface RippleWalletCredentials {
  mnemonic: string;
  networkType: NetworkType;
}

export interface ChainConfig {
  type: SupportedChain;
  network: NetworkType;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
}

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

  // ERC20 Smart Contracts (JSON RPC)
  CREATE_ERC20_JSON_RPC = 'deploy-erc20-json-rpc',
  MINT_ERC20_JSON_RPC = 'mint-erc20-json-rpc',
  TRANSFER_ERC20_JSON_RPC = 'transfer-erc20-json-rpc',

  // ERC20 Smart Contracts (SDK)
  CREATE_ERC20_SDK = 'deploy-erc20-sdk',
  MINT_ERC20_SDK = 'mint-erc20-sdk',
  TRANSFER_ERC20_SDK = 'transfer-erc20-sdk',

  // ERC721 Smart Contracts (JSON RPC)
  CREATE_ERC721_JSON_RPC = 'deploy-erc721-json-rpc',
  MINT_ERC721_JSON_RPC = 'mint-erc721-json-rpc',
  TRANSFER_ERC721_JSON_RPC = 'transfer-erc721-json-rpc',

  // ERC721 Smart Contracts (SDK)
  CREATE_ERC721_SDK = 'deploy-erc721-sdk',
  MINT_ERC721_SDK = 'mint-erc721-sdk',
  TRANSFER_ERC721_SDK = 'transfer-erc721-sdk',

  // HCS or passing message as transfer memo
  SUBMIT_MESSAGE = 'submit-message',
}

export enum NetworkType {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export type AccountData = {
  accountAddress: string;
  privateKey: string;
  publicKey: string;
};
export interface TransactionRecord {
  chain: string;
  operation: string;
  usdCost: string;
  gasUsed: string;
  transactionHash: string;
  nativeCurrencySymbol: string;
  status: string;
  timestamp: string;
}
