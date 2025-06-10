import { CostComparisonTool } from './services/CostComparisonTool';
import { cliConfig } from './utils/cli';

async function main() {
  try {
    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);

    const tool = new CostComparisonTool();
    const response = await tool.run(cliConfig.chains, cliConfig.operations);
    console.log(response);
  } catch (error) {
    console.error('An error occurred while running the CostComparisonTool:', error);
  }
}

main();
