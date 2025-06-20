import { ChainConfig, FullTransactionResult } from '../../types';

export interface IChainOperations {
  // Native Fungible Token Operations
  createNativeFT(): Promise<FullTransactionResult>;

  associateNativeFT(): Promise<FullTransactionResult>;

  mintNativeFT(): Promise<FullTransactionResult>;

  transferNativeFT(): Promise<FullTransactionResult>;

  // ERC20 Operations - SDK
  createERC20_SDK(): Promise<FullTransactionResult>;

  mintERC20_SDK(): Promise<FullTransactionResult>;

  transferERC20_SDK(): Promise<FullTransactionResult>;

  // ERC20 Operations - RPC
  createERC20_RPC(): Promise<FullTransactionResult>;

  mintERC20_RPC(): Promise<FullTransactionResult>;

  transferERC20_RPC(): Promise<FullTransactionResult>;

  // Native NFT Operations
  createNativeNFT(): Promise<FullTransactionResult>;

  associateNativeNFT(): Promise<FullTransactionResult>;

  mintNativeNFT(): Promise<FullTransactionResult>;

  transferNativeNFT(): Promise<FullTransactionResult>;

  // ERC721 Operations - SDK
  createERC721_SDK(): Promise<FullTransactionResult>;

  mintERC721_SDK(): Promise<FullTransactionResult>;

  transferERC721_SDK(): Promise<FullTransactionResult>;

  // ERC721 Operations - RPC
  createERC721_RPC(): Promise<FullTransactionResult>;

  mintERC721_RPC(): Promise<FullTransactionResult>;

  transferERC721_RPC(): Promise<FullTransactionResult>;

  // Message/Memo Operation
  submitMessage(): Promise<FullTransactionResult>;

  // Utility
  getChainInfo(): ChainConfig;

  isHealthy(): Promise<boolean>;
}
