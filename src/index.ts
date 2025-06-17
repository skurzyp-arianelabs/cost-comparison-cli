import { cliConfig } from './utils/cli';
import { CostComparisonToolRefactored } from './services/CostComparisonToolRefactored';

async function main() {
  try {
    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);

    // const tool = new CostComparisonTool();
    const tool = new CostComparisonToolRefactored();
    const response = await tool.run(cliConfig.chains, cliConfig.operations);
    console.log(response);
  } catch (error) {
    console.error('An error occurred while running the CostComparisonTool:', error);
  }
}

main();
