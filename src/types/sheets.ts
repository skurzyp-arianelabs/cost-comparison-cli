import { sheets_v4 } from 'googleapis';

export interface ColumnMetadata {
  pixelSize?: number;
}

export interface SheetWithMetadata extends sheets_v4.Schema$Sheet {
  columnMetadata?: ColumnMetadata[];
}

export interface SheetData {
  values: string[][];
  columnWidths: number[];
}

export interface TransactionRecord {
  chain: string;
  operation: string;
  usdCost: string;
  [key: string]: string; // Allow for additional fields
} 