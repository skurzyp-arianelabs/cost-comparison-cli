import { ExtendedChain, TransactionResult } from '../../types';

export interface IChainOperations {
  // Native Fungible Token Operations
  createNativeFT(): Promise<TransactionResult>;
  associateNativeFT(): Promise<TransactionResult>;
  mintNativeFT(): Promise<TransactionResult>;
  transferNativeFT(): Promise<TransactionResult>;

  // ERC20 Operations - SDK
  createERC20_SDK(): Promise<TransactionResult>;
  mintERC20_SDK(): Promise<TransactionResult>;
  transferERC20_SDK(): Promise<TransactionResult>;

  // ERC20 Operations - RPC
  createERC20_RPC(): Promise<TransactionResult>;
  mintERC20_RPC(): Promise<TransactionResult>;
  transferERC20_RPC(): Promise<TransactionResult>;

  // Native NFT Operations
  createNativeNFT(): Promise<TransactionResult>;
  associateNativeNFT(): Promise<TransactionResult>;
  mintNativeNFT(): Promise<TransactionResult>;
  transferNativeNFT(): Promise<TransactionResult>;

  // ERC721 Operations - SDK
  createERC721_SDK(): Promise<TransactionResult>;
  mintERC721_SDK(): Promise<TransactionResult>;
  transferERC721_SDK(): Promise<TransactionResult>;

  // ERC721 Operations - RPC
  createERC721_RPC(): Promise<TransactionResult>;
  mintERC721_RPC(): Promise<TransactionResult>;
  transferERC721_RPC(): Promise<TransactionResult>;

  // HCS Operation
  hcsSubmitMessage(): Promise<TransactionResult>;

  // Utility
  getChainInfo(): ExtendedChain;
  isHealthy(): Promise<boolean>;
}
