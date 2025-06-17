import { ConfigService } from './ConfigService/ConfigService';
import {
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../types';
import { ChainOperationsFactory } from '../chains/factories/OperationsFactory';
import { IChainOperations } from '../chains/abstract/IChainOperations';
import { ChainOperationsStrategy } from '../chains/ChainOperationsStrategy';

export class CostComparisonToolRefactored {
  private configService: ConfigService;
  private chainOperationsFactory: ChainOperationsFactory;

  constructor() {
    this.configService = new ConfigService();
    this.chainOperationsFactory = new ChainOperationsFactory(
      this.configService
    );
  }

  public async run(
    chains: SupportedChain[],
    selectedOperations: SupportedOperation[]
  ): Promise<void> {
    // Create chain operations
    const chainOperationsList = chains.map((chainType) => ({
      chainId: chainType,
      chainOperations:
        this.chainOperationsFactory.createChainOperations(chainType),
    }));

    console.log('Checking chain connectivity...');
    const healthChecks = await Promise.all(
      chainOperationsList.map(async ({ chainId, chainOperations }) => ({
        chainId,
        healthy: await chainOperations.isHealthy(),
      }))
    );

    const unhealthyChains = healthChecks.filter((hc) => !hc.healthy);
    if (unhealthyChains.length > 0) {
      console.warn(
        `⚠️  Warning: Some chains are not responding: ${unhealthyChains.map((hc) => hc.chainId).join(', ')}`
      );
    }

    const healthyClients = chainOperationsList.filter(
      ({ chainId }) =>
        healthChecks.find((hc) => hc.chainId === chainId)?.healthy
    );

    if (healthyClients.length === 0) {
      throw new Error('No healthy chains available');
    }

    console.log(
      `🚀 Executing ${selectedOperations.length} operations across ${healthyClients.length} chains`
    );

    const results = await this.executeSequentialOperations(
      chainOperationsList,
      selectedOperations
    );

    console.log(JSON.stringify(results, null, 2));
    return;
  }

  private async executeSequentialOperations(
    chainOperationsList: Array<{ chainId: SupportedChain; chainOperations: IChainOperations }>,
    selectedOperations: SupportedOperation[]
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];
    for (const { chainId, chainOperations } of chainOperationsList) {
      for (const selectedOperation of selectedOperations) {
        try {
          console.log(`Running ${selectedOperation} on ${chainId}`);
          const result = await ChainOperationsStrategy.executeOperation(
            selectedOperation,
            chainOperations
          );
          results.push(result);
        } catch (error) {
          console.error(
            `Error executing ${selectedOperation} on ${chainId}:`,
            error
          );
        }
      }
    }
    return results;
  }
}
