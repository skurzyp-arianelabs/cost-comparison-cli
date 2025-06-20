import { cliConfig } from './utils/cli';
import { CostComparisonTool } from './services/CostComparisonTool';
import { fileURLToPath } from 'url';
import { SheetsService } from './services/SheetsService';
import path from 'path';

async function main() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID not found in .env file');
    }

    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);

    const tool = new CostComparisonTool(cliConfig.network);
    const csvPath = await tool.run(cliConfig.chains, cliConfig.operations);

    if (csvPath.length > 0) {
      const sheetsService = SheetsService.getInstance();
      await sheetsService.putComparisionResultsInGS(spreadsheetId, csvPath);
    }
  } catch (error) {
    console.error(
      'An error occurred while running the CostComparisonTool:',
      error
    );
  }

}

main();
