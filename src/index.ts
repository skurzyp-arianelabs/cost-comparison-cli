import { cliConfig } from './utils/cli';
import { CostComparisonTool } from './services/CostComparisonTool';

async function main() {
  try {
    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);

    const tool = new CostComparisonTool(cliConfig.network);
    await tool.run(cliConfig.chains, cliConfig.operations);
  } catch (error) {
    console.error(
      'An error occurred while running the CostComparisonTool:',
      error
    );
  }
}

main();
