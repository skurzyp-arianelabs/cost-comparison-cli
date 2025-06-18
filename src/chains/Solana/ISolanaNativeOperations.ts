import { ChainConfig, TransactionResult } from '../../types';

export interface ISolanaNativeOperations {
  // Native Fungible Token Operations
  createNativeFT(): Promise<TransactionResult>;

  associateNativeFT(): Promise<TransactionResult>;

  mintNativeFT(): Promise<TransactionResult>;

  transferNativeFT(): Promise<TransactionResult>;

  // Native NFT Operations
  createNativeNFT(): Promise<TransactionResult>;

  associateNativeNFT(): Promise<TransactionResult>;

  mintNativeNFT(): Promise<TransactionResult>;

  transferNativeNFT(): Promise<TransactionResult>;

  // Memo submit operation
  submitMemoMessage(): Promise<TransactionResult>;

  // Utility
  isHealthy(): Promise<boolean>;
}
