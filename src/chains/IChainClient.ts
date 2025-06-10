import { SupportedOperation, TransactionResult } from '../types';

export interface IChainClient {
  //FIXME: example methods, to be aligned later with required set of methods
  createNativeFT(): Promise<TransactionResult>;
  associateNativeFT(): Promise<TransactionResult>;
  mintNativeFT(): Promise<TransactionResult>;
  transferNativeFT(): Promise<TransactionResult>;
  isHealthy(): Promise<boolean>;
  executeOperation(operation: SupportedOperation): Promise<TransactionResult>;
}
