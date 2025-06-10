import { CostComparisonTool } from './services/CostComparisonTool';
import { SupportedChain, SupportedOperation } from "./types";

async function main() {
  try {
    const tool = new CostComparisonTool();
    const response = await tool.run([SupportedChain.HEDERA], [SupportedOperation.DEPLOY_ERC20, SupportedOperation.DEPLOY_ERC721]);
    console.log(response);
  } catch (error) {
    console.error('An error occurred while running the CostComparisonTool:', error);
  }
}

main();
