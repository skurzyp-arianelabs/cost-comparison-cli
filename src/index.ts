import 'dotenv/config';
import { cliConfig } from './utils/cli';
import { CostComparisonTool } from './services/CostComparisionTool';

(async () => {
  console.log('--- CLI FLAGS ---');
  console.log(cliConfig);

  const tool = new CostComparisonTool();
  await tool.run(cliConfig.chains);
})();
