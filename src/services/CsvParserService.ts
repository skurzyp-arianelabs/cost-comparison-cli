import { parse } from 'csv-parse';
import * as fs from 'fs';
import { TransactionRecord } from '../types/sheets';

export class CsvParserService {
  private static instance: CsvParserService;

  private constructor() {}

  public static getInstance(): CsvParserService {
    if (!CsvParserService.instance) {
      CsvParserService.instance = new CsvParserService();
    }
    return CsvParserService.instance;
  }

  async parseCSV(filePath: string): Promise<TransactionRecord[]> {
    const records: TransactionRecord[] = [];
    const parser = fs
      .createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }));

    for await (const record of parser) {
      records.push(record as TransactionRecord);
    }

    return records;
  }

  filterHederaRecords(records: TransactionRecord[]): TransactionRecord[] {
    return records.filter(record => record.chain.toLowerCase() === 'hedera');
  }

  groupRecordsByOperation(records: TransactionRecord[]): { [key: string]: TransactionRecord[] } {
    return records.reduce((acc, record) => {
      if (!acc[record.operation]) {
        acc[record.operation] = [];
      }
      acc[record.operation].push(record);
      return acc;
    }, {} as { [key: string]: TransactionRecord[] });
  }

  calculateAverageCost(records: TransactionRecord[]): number {
    const totalCost = records.reduce((sum, record) => sum + parseFloat(record.usdCost), 0);
    return totalCost / records.length;
  }
} 