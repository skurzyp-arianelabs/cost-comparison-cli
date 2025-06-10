import { TransactionResult } from '../types';

export interface IChainClient {
  createNativeFT(): TransactionResult;
  createNativeNFT(): TransactionResult;
  createERC20(): TransactionResult;
  createERC721(): TransactionResult;
}
