import { SubmittableTransaction, TxResponse } from "xrpl";

export interface IRippleNativeOperations {
  // Native Fungible Token Operations
  associateNativeFT(): Promise<TxResponse<SubmittableTransaction>>;

  mintNativeFT(): Promise<TxResponse<SubmittableTransaction>>;

  transferNativeFT(): Promise<TxResponse<SubmittableTransaction>>;

  // Native NFT Operations
  mintNativeNFT(): Promise<TxResponse<SubmittableTransaction>>;

  createNFTCreateOffer(): Promise<TxResponse<SubmittableTransaction>>;

  transferNativeNFT(offerId: string): Promise<TxResponse<SubmittableTransaction>>;

  // Message/memo Operation
  submitMessage(): Promise<TxResponse<SubmittableTransaction>>;

  isHealthy(): Promise<boolean>;
}