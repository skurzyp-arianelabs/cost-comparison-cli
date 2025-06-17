import { TransactionResult } from '../../../types';

export interface INativeHederaSdkOperations {
  // Native Fungible Token (FT)
  createNativeFT(): Promise<TransactionResult>;
  associateNativeFT(): Promise<TransactionResult>;
  mintNativeFT(): Promise<TransactionResult>;
  transferNativeFT(): Promise<TransactionResult>;

  // Native Non-Fungible Token (NFT)
  createNativeNFT(): Promise<TransactionResult>;
  associateNativeNFT(): Promise<TransactionResult>;
  mintNativeNFT(): Promise<TransactionResult>;
  transferNativeNFT(): Promise<TransactionResult>;

  // HCS (Hedera Consensus Service)
  hcsSubmitMessage(): Promise<TransactionResult>;

  // SDK
  createERC20_SDK(): Promise<TransactionResult>;
  mintERC20_SDK(): Promise<TransactionResult>;
  transferERC20_SDK(): Promise<TransactionResult>;

  createERC721_SDK(): Promise<TransactionResult>;
  mintERC721_SDK(): Promise<TransactionResult>;
  transferERC721_SDK(): Promise<TransactionResult>;
}
