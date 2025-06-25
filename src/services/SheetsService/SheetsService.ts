import { google, sheets_v4 } from 'googleapis';
import * as formats from './formats';
import { GroupedResults } from '../../types';
import { ConfigService } from '../ConfigService/ConfigService';
import { createSheetsConstants } from './constants';
import { CellUpdate, FormattingRequest } from './types';

export class SheetsService {
  private readonly OPERATION_TO_ROW;
  private readonly CHAIN_TO_COLUMN;
  private readonly SHEET_TEMPLATE;
  private readonly MERGE_RANGES;
  private readonly CELL_FORMATS;
  private readonly SPREADSHEET_ID;
  private readonly SHEET_NAME;
  private readonly SHEET_ROWS;
  private readonly SHEET_COLS;
  private readonly VERY_MULTIPLIER;
  
  private readonly sheets;

  constructor(private configService: ConfigService) {

    const {
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
    } = createSheetsConstants();

    const auth = new google.auth.GoogleAuth({
      keyFile: this.configService.getGoogleApplicationCredentials(),
      scopes: GOOGLE_API_SCOPES,
    });

    this.sheets = google.sheets({ version: 'v4', auth: auth });
    this.SPREADSHEET_ID = this.configService.getSpreadsheetIds();
    this.SHEET_NAME = SHEET_NAME;
    this.SHEET_ROWS = SHEET_ROWS;
    this.SHEET_COLS = SHEET_COLS;
    this.VERY_MULTIPLIER = VERY_MULTIPLIER;
    this.OPERATION_TO_ROW = OPERATION_TO_ROW;
    this.CHAIN_TO_COLUMN = CHAIN_TO_COLUMN;
    this.SHEET_TEMPLATE = SHEET_TEMPLATE;
    this.MERGE_RANGES = MERGE_RANGES;
    this.CELL_FORMATS = CELL_FORMATS;

  }

  async putComparisionResultsInGS(results: GroupedResults): Promise<void> {
    // Set up the template content
    await this.setupTemplateContent();

    // Collect all cell updates
    await this.buildAndApplyUpdates(results);

    // Print the spreadsheet URL
    console.log('\nSpreadsheet URL:');
    console.log(`https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}`);
  }

  async setupTemplateContent(): Promise<void> {
    // Ensure SUMMARY sheet exists and get it
    const summarySheet = await this.getCleannedOrCreateNewSummarySheet();

    const sheetId = summarySheet.properties!.sheetId!;
    const sheetData = this.SHEET_TEMPLATE;
    
    // Set up the template content
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.SPREADSHEET_ID,
      range: `${this.SHEET_NAME}!A1:S${sheetData.values.length}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: sheetData.values
      }
    });

    // Get formatting requests for column widths
    const requests = this.getColumnWidthRequests(sheetData.columnWidths, sheetId);

    // Add merge requests
    this.MERGE_RANGES.forEach(rangeStr => {
      requests.push({
        mergeCells: {
          range: this.getGridRangeFromString(rangeStr, sheetId),
          mergeType: 'MERGE_ALL'
        }
      });
    });

    // Add cell formatting requests
    this.CELL_FORMATS.forEach(({ ranges, format }) => {
      ranges.forEach(range => {
        requests.push({
          repeatCell: {
            range: this.getGridRangeFromString(range, sheetId),
            cell: {
              userEnteredFormat: format
            },
            fields: this.generateFieldsString(format)
          }
        });
      });
    });

    // Apply all requests
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.SPREADSHEET_ID,
      requestBody: {
        requests
      }
    });
  }

  private async buildAndApplyUpdates(results: GroupedResults): Promise<void> {
    const updates: CellUpdate[] = [];

    for (const [operation, chainData] of Object.entries(results)) {
      const row = this.OPERATION_TO_ROW[operation];
      if (!row) continue;

      // Precompute Hedera cost if present
      const hederaCost = chainData['hedera']?.usdCost
        ? parseFloat(chainData['hedera'].usdCost)
        : NaN;

      for (const [chain, record] of Object.entries(chainData)) {
        const column = this.CHAIN_TO_COLUMN[chain];
        if (!column) continue;

        const cost = record.usdCost ? parseFloat(record.usdCost) : NaN;
        const cell = `${column}${row}`;

        if (isNaN(cost)) {
          updates.push({
            cell,
            value: 'N/A',
            userEnteredFormat: formats.nanFormat
          });
          continue;
        }

        const userEnteredFormat = this.getUserEnteredFormat(chain, cost, hederaCost);
        updates.push({
          cell,
          value: cost,
          userEnteredFormat
        });
      }
    }

    // Update all cells in a single batch
    await this.updateCells(updates);
  }

  async updateCells(updates: CellUpdate[]): Promise<void> {

    const summarySheet = await this.getSummarySheet();
    const sheetId = summarySheet.properties!.sheetId!;

    const requests = updates.map(update => {
      return {
        repeatCell: {
          range: this.getGridRangeFromString(update.cell, sheetId),
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
      spreadsheetId: this.SPREADSHEET_ID,
      requestBody: {
        requests
      }
    });
  }

  private async getCleannedOrCreateNewSummarySheet(): Promise<sheets_v4.Schema$Sheet> {
    let summarySheet: sheets_v4.Schema$Sheet;
    try {
      summarySheet = await this.getSummarySheet();
      await this.clearSheet(summarySheet);
    } catch (e) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: this.SHEET_NAME,
                gridProperties: {
                  rowCount: this.SHEET_ROWS,
                  columnCount: this.SHEET_COLS
                }
              }
            }
          }]
        }
      });
      // Fetch again to get the new sheet object
      summarySheet = await this.getSummarySheet();
    }
    return summarySheet;
  }

  private async getSummarySheet(): Promise<sheets_v4.Schema$Sheet> {
    const spreadsheetResponse = await this.sheets.spreadsheets.get({
      spreadsheetId: this.SPREADSHEET_ID,
      includeGridData: true
    });
    const sheetList = spreadsheetResponse.data.sheets || [];
    const summarySheet = sheetList.find((sheet: sheets_v4.Schema$Sheet) => sheet.properties?.title === this.SHEET_NAME);
    if (!summarySheet?.properties?.sheetId) {
      throw new Error(`Could not find ${this.SHEET_NAME} sheet`);
    }
    return summarySheet;
  }

  private async clearSheet(sheet: sheets_v4.Schema$Sheet): Promise<void> {
    const sheetId = sheet.properties!.sheetId;
    const requests = [];

    // Add unmerge requests for all merged cells
    const merges = sheet.merges || [];
    if (merges.length > 0) {
      merges.forEach((merge: sheets_v4.Schema$GridRange) => {
        requests.push({
          unmergeCells: {
            range: {
              sheetId,
              startRowIndex: merge.startRowIndex,
              endRowIndex: merge.endRowIndex,
              startColumnIndex: merge.startColumnIndex,
              endColumnIndex: merge.endColumnIndex
            }
          }
        });
      });
    }

    // Add request to reset all formatting
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: this.SHEET_ROWS,
          startColumnIndex: 0,
          endColumnIndex: this.SHEET_COLS
        },
        cell: {
          userEnteredFormat: {}
        },
        fields: 'userEnteredFormat'
      }
    });

    // Execute all formatting and unmerge operations in one batch
    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.SPREADSHEET_ID,
        requestBody: { requests }
      });
    }

    // Clear values (needs to be separate since it's a different API endpoint)
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.SPREADSHEET_ID,
      range: `${this.SHEET_NAME}!A1:Z${this.SHEET_ROWS}`
    });
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

  async updateCell(cell: string, value: string): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.SPREADSHEET_ID,
      range: `this.SHEET_NAME!${cell}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[value]]
      }
    });
  }

  private getColumnWidthRequests(columnWidths: number[], sheetId: number): FormattingRequest[] {
    const requests: FormattingRequest[] = [];

    columnWidths.forEach((width, index) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: sheetId,
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

  private getUserEnteredFormat(chain: string, cost: number, hederaCost: number): any {
    if (chain === 'hedera' || isNaN(hederaCost)) {
      return formats.equalPriceFormat;
    }
    if (cost === hederaCost) {
      return formats.equalPriceFormat;
    } else if (cost > hederaCost) {
      return cost >= hederaCost * this.VERY_MULTIPLIER
        ? formats.veryCheapPriceFormat
        : formats.cheaperPriceFormat;
    } else {
      return cost * this.VERY_MULTIPLIER <= hederaCost
        ? formats.veryExpensivePriceFormat
        : formats.expensivePriceFormat;
    }
  }

  private getGridRangeFromString(range: string, sheetId: number): {
    sheetId: number;
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  } {
    const { startRow, endRow, startCol, endCol } = this.convertRangeToIndices(range);
    return {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow,
      startColumnIndex: startCol,
      endColumnIndex: endCol
    };
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
}
