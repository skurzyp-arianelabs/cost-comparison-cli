import { google } from 'googleapis';
import { SheetData } from '../types/sheets';
import * as dotenv from 'dotenv';
import * as formats from '../utils/formats';

dotenv.config();

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

interface FormattingRequest {
  updateDimensionProperties?: {
    range: {
      sheetId: number;
      dimension: string;
      startIndex: number;
      endIndex: number;
    };
    properties: {
      pixelSize: number;
    };
    fields: string;
  };
  repeatCell?: {
    range: {
      sheetId: number;
      startRowIndex: number;
      endRowIndex: number;
      startColumnIndex: number;
      endColumnIndex: number;
    };
    cell: {
      userEnteredFormat: {
        textFormat?: {
          bold?: boolean;
          fontSize?: number;
          foregroundColor?: {
            red: number;
            green: number;
            blue: number;
          };
        };
        backgroundColor?: {
          red: number;
          green: number;
          blue: number;
        };
        horizontalAlignment?: string;
        verticalAlignment?: string;
        wrapStrategy?: string;
        borders?: {
          top?: { style: string; width?: number; color?: { red: number; green: number; blue: number } };
          bottom?: { style: string; width?: number; color?: { red: number; green: number; blue: number } };
          left?: { style: string; width?: number; color?: { red: number; green: number; blue: number } };
          right?: { style: string; width?: number; color?: { red: number; green: number; blue: number } };
        };
      };
    };
    fields: string;
  };
  mergeCells?: {
    range: {
      sheetId: number;
      startRowIndex: number;
      endRowIndex: number;
      startColumnIndex: number;
      endColumnIndex: number;
    };
    mergeType: string;
  };
}

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export class SheetsService {
  private static instance: SheetsService;
  private sheets = sheets;

  private constructor() {}

  public static getInstance(): SheetsService {
    if (!SheetsService.instance) {
      SheetsService.instance = new SheetsService();
    }
    return SheetsService.instance;
  }

  async createSpreadsheet(title: string): Promise<string> {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title
        }
      }
    });

    return response.data.spreadsheetId || '';
  }

  private async ensureSummarySheet(spreadsheetId: string): Promise<void> {
    // Get all sheets in the spreadsheet
    const spreadsheetResponse = await this.sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    const sheetList = spreadsheetResponse.data.sheets || [];
    const summarySheet = sheetList.find(sheet => sheet.properties?.title === 'SUMMARY');

    if (!summarySheet) {
      // Create a new SUMMARY sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'SUMMARY',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26
                }
              }
            }
          }]
        }
      });
    }
  }

  private async clearSheet(spreadsheetId: string): Promise<void> {
    // Get the sheet ID for the SUMMARY sheet and its merges
    const spreadsheetResponse = await this.sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true
    });

    const summarySheet = spreadsheetResponse.data.sheets?.find(
      sheet => sheet.properties?.title === 'SUMMARY'
    );

    if (!summarySheet?.properties?.sheetId) {
      throw new Error('Could not find SUMMARY sheet');
    }

    const sheetId = summarySheet.properties.sheetId;

    // Unmerge all merged cells
    const merges = summarySheet.merges || [];
    if (merges.length > 0) {
      const unmergeRequests = merges.map(merge => ({
        unmergeCells: {
          range: {
            sheetId,
            startRowIndex: merge.startRowIndex,
            endRowIndex: merge.endRowIndex,
            startColumnIndex: merge.startColumnIndex,
            endColumnIndex: merge.endColumnIndex
          }
        }
      }));
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: unmergeRequests }
      });
    }

    // Clear values
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'SUMMARY!A1:Z1000'
    });

    // Reset all formatting to Google Sheets defaults
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1000,
              startColumnIndex: 0,
              endColumnIndex: 26
            },
            cell: {
              userEnteredFormat: {}
            },
            fields: 'userEnteredFormat'
          }
        }]
      }
    });
  }

  private convertRangeToIndices(range: string): { startRow: number; endRow: number; startCol: number; endCol: number } {
    // Parse range like "A1:C1" or "A1" into indices
    
    try {
      const [start, end] = range.split(':') as [string, string];
      
      const getColumnIndex = (col: string) => {
        let index = 0;
        for (let i = 0; i < col.length; i++) {
          index = index * 26 + (col.charCodeAt(i) - 64); // 'A' is 65 in ASCII
        }
        return index - 1; // Convert to 0-based index
      };

      const getRowIndex = (row: string) => parseInt(row) - 1; // Convert to 0-based index

      const startCol = getColumnIndex(start.match(/[A-Z]+/)?.[0] || '');
      const startRow = getRowIndex(start.match(/\d+/)?.[0] || '');
      
      if (!end) {
        return {
          startRow,
          endRow: startRow + 1,
          startCol,
          endCol: startCol + 1
        };
      }

      const endCol = getColumnIndex(end.match(/[A-Z]+/)?.[0] || '');
      const endRow = getRowIndex(end.match(/\d+/)?.[0] || '');

      return {
        startRow,
        endRow: endRow + 1,
        startCol,
        endCol: endCol + 1
      };
    } catch (error) {
      console.error(
        `Error parsing range: "${range}"`,
        error
      );
      throw new Error(
        `Error parsing range: "${range}"`
      );
    }

  }

  private generateFieldsString(format: any): string {
    const fields = [];
    if (format.borders) fields.push('borders');
    if (format.backgroundColor) fields.push('backgroundColor');
    if (format.horizontalAlignment) fields.push('horizontalAlignment');
    if (format.verticalAlignment) fields.push('verticalAlignment');
    if (format.wrapStrategy) fields.push('wrapStrategy');
    if (format.textFormat) {
      fields.push('textFormat');
      if (format.textFormat.bold !== undefined) fields.push('textFormat.bold');
      if (format.textFormat.foregroundColor) fields.push('textFormat.foregroundColor');
    }
    return `userEnteredFormat(${fields.join(',')})`;
  }

  async setupTemplateContent(spreadsheetId: string): Promise<void> {
    // Ensure SUMMARY sheet exists
    await this.ensureSummarySheet(spreadsheetId);
    
    // Get the sheet ID for the SUMMARY sheet
    const spreadsheetResponse = await this.sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    const summarySheet = spreadsheetResponse.data.sheets?.find(
      sheet => sheet.properties?.title === 'SUMMARY'
    );

    if (!summarySheet?.properties?.sheetId) {
      throw new Error('Could not find SUMMARY sheet');
    }

    const sheetId = summarySheet.properties.sheetId;
    
    // Clear existing content
    await this.clearSheet(spreadsheetId);
    
    const sheetData = this.getTemplateData();
    
    // Set up the template content
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `SUMMARY!A1:S${sheetData.values.length}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: sheetData.values
      }
    });

    // Get formatting requests including column widths and header formatting
    const requests = this.getFormattingRequests(sheetData.columnWidths);
    requests.forEach(request => {
      if (request.updateDimensionProperties) {
        request.updateDimensionProperties.range.sheetId = sheetId;
      }
      if (request.repeatCell) {
        request.repeatCell.range.sheetId = sheetId;
      }
      if (request.mergeCells) {
        request.mergeCells.range.sheetId = sheetId;
      }
    });

    // Define merge ranges (string ranges)
    const mergeRanges = [
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

    // Add merge requests
    mergeRanges.forEach(rangeStr => {
      const { startRow, endRow, startCol, endCol } = this.convertRangeToIndices(rangeStr);
      requests.push({
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: startRow,
            endRowIndex: endRow,
            startColumnIndex: startCol,
            endColumnIndex: endCol
          },
          mergeType: 'MERGE_ALL'
        }
      });
    });

    // Define cell formats (no merge info)
    const cellFormats = [
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

    // Add formatting requests
    cellFormats.forEach(({ ranges, format }) => {
      ranges.forEach(range => {
        const { startRow, endRow, startCol, endCol } = this.convertRangeToIndices(range);
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: startRow,
              endRowIndex: endRow,
              startColumnIndex: startCol,
              endColumnIndex: endCol
            },
            cell: {
              userEnteredFormat: format
            },
            fields: this.generateFieldsString(format)
          }
        });
      });
    });

    // Apply formatting
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests
      }
    });
  }

  async updateCell(spreadsheetId: string, cell: string, value: string): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'SUMMARY'!${cell}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[value]]
      }
    });
  }

  async updateCells(spreadsheetId: string, updates: { cell: string; value: string | number; userEnteredFormat: { numberFormat: { type: string; pattern?: string } } }[]): Promise<void> {
    // Get the sheet ID for the SUMMARY sheet
    const spreadsheetResponse = await this.sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    const summarySheet = spreadsheetResponse.data.sheets?.find(
      sheet => sheet.properties?.title === 'SUMMARY'
    );

    if (!summarySheet?.properties?.sheetId) {
      throw new Error('Could not find SUMMARY sheet');
    }

    const sheetId = summarySheet.properties.sheetId;

    const requests = updates.map(update => {
      const { startRow, endRow, startCol, endCol } = this.convertRangeToIndices(update.cell);
      
      return {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: startRow,
            endRowIndex: endRow,
            startColumnIndex: startCol,
            endColumnIndex: endCol
          },
          cell: {
            userEnteredValue: {
              [typeof update.value === 'number' ? 'numberValue' : 'stringValue']: update.value
            },
            userEnteredFormat: update.userEnteredFormat
          },
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };
    });

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests
      }
    });
  }

  private getTemplateData(): SheetData {
    return {
      values: [
        ['Compared to the competition, Hedera is', '', '', 'Very expensive over 10X', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', 'Expensive - but under 10X', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', 'Cheaper by under 10X', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', 'Very Cheap over 10X', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
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
  }

  private getFormattingRequests(columnWidths: number[]): FormattingRequest[] {
    const requests: FormattingRequest[] = [];

    // Add column width requests
    columnWidths.forEach((width, index) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1
          },
          properties: {
            pixelSize: width
          },
          fields: 'pixelSize'
        }
      });
    });

    return requests;
  }

  async putComparisionResultsInGS(spreadsheetId: string, csvPath: string): Promise<void> {
    const csvService = (await import('./CsvParserService')).CsvParserService.getInstance();
    const formats = await import('../utils/formats');
    const { OPERATION_TO_ROW, CHAIN_TO_COLUMN } = await import('../utils/constants');

    // Parse CSV file
    const records = await csvService.parseCSV(csvPath);

    // Group records by operation and chain
    const groups = records.reduce((acc, record) => {
      const chain = record.chain.toLowerCase();
      const operation = record.operation;
      if (!acc[operation]) {
        acc[operation] = {};
      }
      if (!acc[operation][chain]) {
        acc[operation][chain] = [];
      }
      acc[operation][chain].push(record);
      return acc;
    }, {} as { [key: string]: { [key: string]: any[] } });

    // Set up the template content
    await this.setupTemplateContent(spreadsheetId);
    console.log('Template content has been set up');

    // Collect all cell updates
    const updates: { cell: string; value: string | number; userEnteredFormat: any }[] = Object.entries(groups)
      .flatMap(([operation, chainData]) => {
        const row = OPERATION_TO_ROW[operation];
        if (!row) return [];

        return Object.entries(chainData)
          .map(([chain, records]) => {
            const column = CHAIN_TO_COLUMN[chain];
            if (!column) return null;

            const averageCost = csvService.calculateAverageCost(records);
            const cell = `${column}${row}`;

            // Handle NaN values
            if (isNaN(averageCost)) {
              return {
                cell,
                value: 'N/A',
                userEnteredFormat: formats.nanFormat
              };
            }

            let userEnteredFormat = formats.equalPriceFormat;

            if (chain === 'hedera') {
              userEnteredFormat = formats.equalPriceFormat;
            } else {
              const hederaAvg = chainData['hedera']
                ? csvService.calculateAverageCost(chainData['hedera'])
                : NaN;
              if (averageCost === hederaAvg) {
                userEnteredFormat = formats.equalPriceFormat;
              } else if (averageCost > hederaAvg) {
                if (averageCost >= hederaAvg * 10) {
                  userEnteredFormat = formats.veryCheapPriceFormat;
                } else {
                  userEnteredFormat = formats.cheaperPriceFormat;
                }
              } else if (averageCost < hederaAvg) {
                if (averageCost * 10 <= hederaAvg) {
                  userEnteredFormat = formats.veryExpensivePriceFormat;
                } else {
                  userEnteredFormat = formats.expensivePriceFormat;
                }
              }
            }
            return {
              cell,
              value: averageCost,
              userEnteredFormat
            };
          })
          .filter(notNull);
      });

    // Update all cells in a single batch
    await this.updateCells(spreadsheetId, updates);

    // Print the spreadsheet URL
    console.log('\nSpreadsheet URL:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
  }
} 