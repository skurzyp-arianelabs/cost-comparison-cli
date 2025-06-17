import { ExtendedChain } from '../../types';
import { IChainOperations } from '../abstract/IChainOperations';
import { IEvmRpcOperations } from './evm-operations/IEvmRpcOperations';
import { INativeHederaSdkOperations } from './hashgraph-sdk-operations/INativeHederaSdkOperations';

export class HederaChainOperations implements IChainOperations {
  constructor(
    private nativeSdkOps: INativeHederaSdkOperations,
    private evmRpcOps: IEvmRpcOperations
  ) {}

  // Delegate native SDK operations
  createNativeFT() {
    return this.nativeSdkOps.createNativeFT();
  }
  associateNativeFT() {
    return this.nativeSdkOps.associateNativeFT();
  }
  mintNativeFT() {
    return this.nativeSdkOps.mintNativeFT();
  }
  transferNativeFT() {
    return this.nativeSdkOps.transferNativeFT();
  }

  createNativeNFT() {
    return this.nativeSdkOps.createNativeNFT();
  }
  associateNativeNFT() {
    return this.nativeSdkOps.associateNativeNFT();
  }
  mintNativeNFT() {
    return this.nativeSdkOps.mintNativeNFT();
  }
  transferNativeNFT() {
    return this.nativeSdkOps.transferNativeNFT();
  }

  createERC20_SDK() {
    return this.nativeSdkOps.createERC20_SDK();
  }
  mintERC20_SDK() {
    return this.nativeSdkOps.mintERC20_SDK();
  }
  transferERC20_SDK() {
    return this.nativeSdkOps.transferERC20_SDK();
  }

  createERC721_SDK() {
    return this.nativeSdkOps.createERC721_SDK();
  }
  mintERC721_SDK() {
    return this.nativeSdkOps.mintERC721_SDK();
  }
  transferERC721_SDK() {
    return this.nativeSdkOps.transferERC721_SDK();
  }

  hcsSubmitMessage() {
    return this.nativeSdkOps.hcsSubmitMessage();
  }

  // Delegate EVM RPC operations
  createERC20_RPC() {
    return this.evmRpcOps.createERC20_RPC();
  }
  mintERC20_RPC() {
    return this.evmRpcOps.mintERC20_RPC();
  }
  transferERC20_RPC() {
    return this.evmRpcOps.transferERC20_RPC();
  }

  createERC721_RPC() {
    return this.evmRpcOps.createERC721_RPC();
  }
  mintERC721_RPC() {
    return this.evmRpcOps.mintERC721_RPC();
  }
  transferERC721_RPC() {
    return this.evmRpcOps.transferERC721_RPC();
  }

  // utils
  isHealthy() {
    return this.evmRpcOps.isHealthy();
  }

  getChainInfo(): ExtendedChain {
    throw new Error('Method not implemented.');
  }
}
