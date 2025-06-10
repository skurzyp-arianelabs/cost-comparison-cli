import { CostComparisonTool } from './services/CostComparisonTool';
import { SupportedChain, SupportedOperation } from "./types";
import { cliConfig } from './utils/cli';

async function main() {
  try {
    console.log('--- CLI FLAGS ---');
    console.log(cliConfig);
    console.log(cliConfig.chains);
    // TODO: console.log(cliConfig.operations);

    const tool = new CostComparisonTool();
    const response = await tool.run([SupportedChain.HEDERA], [SupportedOperation.DEPLOY_ERC20, SupportedOperation.DEPLOY_ERC721]);
    console.log(response);
  } catch (error) {
    console.error('An error occurred while running the CostComparisonTool:', error);
  }
}

main();
