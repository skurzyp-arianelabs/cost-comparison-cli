export interface CellUpdate {
  cell: string;
  value: string | number;
  userEnteredFormat: any 
};

export interface SheetData {
  values: string[][];
  columnWidths: number[];
}

export interface FormattingRequest {
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
