import { TransactionResult } from '../../types';

export interface IStellarNativeOperations {
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

  // Message/Memo Operation
  submitMessage(): Promise<TransactionResult>;

  // Utility
  isHealthy(): Promise<boolean>;
}
