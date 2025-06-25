import { SupportedChain, SupportedOperation } from '../../types';
import { SheetData } from './types';
import * as formats from './formats';

export function createSheetsConstants() {
  const GOOGLE_API_SCOPES: string[] = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ];

  const OPERATION_TO_ROW: { [key: string]: number } = {
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

  const CHAIN_TO_COLUMN: { [key: string]: string } = {
    [SupportedChain.HEDERA]: 'C',
    [SupportedChain.SOLANA]: 'E',
    [SupportedChain.STELLAR]: 'G',
    [SupportedChain.AVALANCHE]: 'I',
    [SupportedChain.RIPPLE]: 'K',
    [SupportedChain.OPTIMISM]: 'M',
  };

  const VERY_MULTIPLIER = 10;

  const SHEET_TEMPLATE : SheetData = {
    values: [
        ['Compared to the competition, Hedera is', '', '', `Very expensive over ${VERY_MULTIPLIER}X`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', `Expensive - but under ${VERY_MULTIPLIER}X`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', `Cheaper by under ${VERY_MULTIPLIER}X`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', `Very Cheap over ${VERY_MULTIPLIER}X`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', 'Hedera', '', 'Solana', '', 'Stellar', '', 'Avalanche', '', 'Ripple', '', '', '', '', '', '', '', ''],
        ['', '', 'Fixed price', '', 'Average', '', 'Average', '', 'Average', '', 'Average', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['Native Tokens - Fungible', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Associate', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['Native Tokens - Non Fungible', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Associate', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['ERC20 Smart Contracts (Hardhat JSON RPC)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['ERC20 Smart Contracts (SDK)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['ERC721 Smart Contracts (Hardhat JSON RPC)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['ERC721 Smart Contracts (SDK)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Create', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Mint', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Transfer', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['HCS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['  Message Submit 900bytes', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ],
    columnWidths: [190, 40, 110, 40, 110, 40, 110, 40, 110, 40, 110, 40]
    };

  const MERGE_RANGES = [
    // Colour codes
    'A1:C1',
    'D1:G1',
    'D2:G2',
    'D3:G3',
    'D4:G4',
    // Section headers
    'A9:K9',
    'A15:K15',
    'A21:K21',
    'A26:K26',
    'A31:K31',
    'A36:K36',
    'A41:K41'
  ];

  const CELL_FORMATS = [
    {
      ranges: ['A1:C1'],
      format: {
        horizontalAlignment: 'RIGHT',
        verticalAlignment: 'TOP',
        textFormat: {
          bold: true
        }
      }
    },
    {
      ranges: ['D1:G1'],
      format: formats.veryExpensiveFormat
    },
    {
      ranges: ['D2:G2'],
      format: formats.expensiveFormat
    },
    {
      ranges: ['D3:G3'],
      format: formats.cheaperFormat
    },
    {
      ranges: ['D4:G4'],
      format: formats.veryCheapFormat
    },
    {
      ranges: ['C6:C7','E6:E7','G6:G7','>I6:I7','K6:K7'],
      format: formats.dataHeaderFormat
    },
    {
      ranges: ['A9:K9','A15:K15','A21:K21','A26:K26','A31:K31','A36:K36','A41:K41'],
      format: formats.sectionHeaderFormat
    }
  ];

  const SHEET_NAME = 'SUMMARY';

  const SHEET_ROWS = 1000;

  const SHEET_COLS = 26;

  return {
    GOOGLE_API_SCOPES,
    OPERATION_TO_ROW,
    CHAIN_TO_COLUMN,
    SHEET_TEMPLATE,
    MERGE_RANGES,
    CELL_FORMATS,
    SHEET_NAME,
    SHEET_ROWS,
    SHEET_COLS,
    VERY_MULTIPLIER,
  };
}