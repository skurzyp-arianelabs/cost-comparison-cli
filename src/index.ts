import { cliConfig } from './utils/cli';
import { ConfigService } from './services/ConfigService/ConfigService';
import { CostComparisonTool } from './services/CostComparisonTool';
import { SheetsService } from './services/SheetsService/SheetsService';
import {
  NetworkType,
  SupportedOperation,
  SupportedChain,
  FullTransactionResult,
  GroupedResults
} from './types';

async function main() {
  try {

    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);

    const networkType = cliConfig.network as NetworkType
    const configService = new ConfigService(networkType);

    const tool = new CostComparisonTool(configService);
    const results = await tool.run(cliConfig.chains, cliConfig.operations);

    if (results.length > 0) {
      // Initialize groups with all SupportedOperation keys
      const groups: GroupedResults = Object.values(SupportedOperation).reduce((acc, op) => {
        acc[op] = {} as Record<SupportedChain, FullTransactionResult>;
        return acc;
      }, {} as GroupedResults);

      for (const record of results) {
        const operation = record.operation as SupportedOperation;
        const chain = record.chain as SupportedChain;
        groups[operation][chain] = record;
      }

      const sheetsService = new SheetsService(configService);
      await sheetsService.putComparisionResultsInGS(groups);
    }
  } catch (error) {
    console.error(
      'An error occurred while running the CostComparisonTool:',
      error
    );
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      'An error occurred while running the CostComparisonTool:',
      error
    );
    process.exit(1);
  });
