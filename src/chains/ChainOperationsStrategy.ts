import { SupportedOperation, FullTransactionResult } from '../types';
import { IChainOperations } from './abstract/IChainOperations';

export class ChainOperationsStrategy {
  static async executeOperation(
    operation: SupportedOperation,
    operations: IChainOperations
  ): Promise<FullTransactionResult> {
    const operationMap: Record<SupportedOperation, () => Promise<FullTransactionResult>> = {
      [SupportedOperation.CREATE_NATIVE_FT]: () => operations.createNativeFT(),
      [SupportedOperation.ASSOCIATE_NATIVE_FT]: () => operations.associateNativeFT(),
      [SupportedOperation.MINT_NATIVE_FT]: () => operations.mintNativeFT(),
      [SupportedOperation.TRANSFER_NATIVE_FT]: () => operations.transferNativeFT(),

      [SupportedOperation.CREATE_ERC20_SDK]: () => operations.createERC20_SDK(),
      [SupportedOperation.MINT_ERC20_SDK]: () => operations.mintERC20_SDK(),
      [SupportedOperation.TRANSFER_ERC20_SDK]: () => operations.transferERC20_SDK(),

      [SupportedOperation.CREATE_ERC20_JSON_RPC]: () => operations.createERC20_RPC(),
      [SupportedOperation.MINT_ERC20_JSON_RPC]: () => operations.mintERC20_RPC(),
      [SupportedOperation.TRANSFER_ERC20_JSON_RPC]: () => operations.transferERC20_RPC(),

      [SupportedOperation.CREATE_ERC721_SDK]: () => operations.createERC721_SDK(),
      [SupportedOperation.MINT_ERC721_SDK]: () => operations.mintERC721_SDK(),
      [SupportedOperation.TRANSFER_ERC721_SDK]: () => operations.transferERC721_SDK(),

      [SupportedOperation.CREATE_ERC721_JSON_RPC]: () => operations.createERC721_RPC(),
      [SupportedOperation.MINT_ERC721_JSON_RPC]: () => operations.mintERC721_RPC(),
      [SupportedOperation.TRANSFER_ERC721_JSON_RPC]: () => operations.transferERC721_RPC(),

      [SupportedOperation.CREATE_NATIVE_NFT]: () => operations.createNativeNFT(),
      [SupportedOperation.ASSOCIATE_NATIVE_NFT]: () => operations.associateNativeNFT(),
      [SupportedOperation.MINT_NATIVE_NFT]: () => operations.mintNativeNFT(),
      [SupportedOperation.TRANSFER_NATIVE_NFT]: () => operations.transferNativeNFT(),

      [SupportedOperation.SUBMIT_MESSAGE]: () => operations.submitMessage(),
    };

    const method = operationMap[operation];

    if (!method) {
      throw new Error(`executeOperation: Operation '${operation}' is not implemented or supported.`);
    }

    try {
      return await method();
    } catch (error: any) {
      console.error(`Execution failed for operation '${operation}':`, error);
      return {
        status: 'failed',
        error: error.message || String(error),
        timestamp: Date.now().toLocaleString(),
        operation,
        chain: operations.getChainInfo().type,
      };
    }
  }
}
