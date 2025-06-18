import { TransactionResult } from '../../types';

export interface IEvmRpcOperations {
  // ERC-20 via RPC
  createERC20_RPC(): Promise<TransactionResult>;

  mintERC20_RPC(): Promise<TransactionResult>;

  transferERC20_RPC(): Promise<TransactionResult>;

  // ERC-721 via RPC
  createERC721_RPC(): Promise<TransactionResult>;

  mintERC721_RPC(): Promise<TransactionResult>;

  transferERC721_RPC(): Promise<TransactionResult>;

  submitMessage(): Promise<TransactionResult>;

  // Health check
  isHealthy(): Promise<boolean>;
}
