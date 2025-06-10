import { SupportedOperation, TransactionResult } from '../types';

export interface IChainClient {
  //FIXME: example methods, to be aligned later with required set of methods
  createNativeFT(): Promise<TransactionResult>;
  createNativeNFT(): Promise<TransactionResult>;
  deployERC20(): Promise<TransactionResult>;
  deployERC721(): Promise<TransactionResult>;
  isHealthy(): Promise<boolean>;
  executeOperation(operation: SupportedOperation): Promise<TransactionResult>;
}
