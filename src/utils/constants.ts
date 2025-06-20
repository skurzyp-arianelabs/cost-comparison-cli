import { SupportedOperation } from '../types';

export const MEMO_TEXT = `What is Lorem Ipsum?

Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
Why do we use it?

It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making.`;

// Stellar has 28 bytes limit for memo messages
// reference: https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/memos
export const MEMO_TEXT_28_BYTES = `What is Lorem Ipsum? Lorem`;


// Google Sheet exporter config
export const CHAIN_TO_COLUMN: { [key: string]: string; } = {
  'hedera': 'C',
  'solana': 'E',
  'stellar': 'G',
  'avalanche': 'I',
  'ripple': 'K'
};
export const OPERATION_TO_ROW: { [key: string]: number; } = {
  [SupportedOperation.CREATE_NATIVE_FT]: 10,
  [SupportedOperation.ASSOCIATE_NATIVE_FT]: 11,
  [SupportedOperation.MINT_NATIVE_FT]: 12,
  [SupportedOperation.TRANSFER_NATIVE_FT]: 13,
  [SupportedOperation.CREATE_NATIVE_NFT]: 16,
  [SupportedOperation.ASSOCIATE_NATIVE_NFT]: 17,
  [SupportedOperation.MINT_NATIVE_NFT]: 18,
  [SupportedOperation.TRANSFER_NATIVE_NFT]: 19,
  [SupportedOperation.CREATE_ERC20_JSON_RPC]: 22,
  [SupportedOperation.MINT_ERC20_JSON_RPC]: 23,
  [SupportedOperation.TRANSFER_ERC20_JSON_RPC]: 24,
  [SupportedOperation.CREATE_ERC20_SDK]: 27,
  [SupportedOperation.MINT_ERC20_SDK]: 28,
  [SupportedOperation.TRANSFER_ERC20_SDK]: 29,
  [SupportedOperation.CREATE_ERC721_JSON_RPC]: 32,
  [SupportedOperation.MINT_ERC721_JSON_RPC]: 33,
  [SupportedOperation.TRANSFER_ERC721_JSON_RPC]: 34,
  [SupportedOperation.CREATE_ERC721_SDK]: 37,
  [SupportedOperation.MINT_ERC721_SDK]: 38,
  [SupportedOperation.TRANSFER_ERC721_SDK]: 39,
  [SupportedOperation.SUBMIT_MESSAGE]: 42
};

