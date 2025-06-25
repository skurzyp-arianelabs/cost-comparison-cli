import { ConfigService } from './ConfigService/ConfigService';
import { CsvWriterService, CsvRow } from './CsvWriterService';
import {
  SupportedChain,
  SupportedOperation,
  FullTransactionResult,
} from '../types';
import { ChainOperationsFactory } from '../chains/factories/OperationsFactory';
import { IChainOperations } from '../chains/abstract/IChainOperations';
import { ChainOperationsStrategy } from '../chains/ChainOperationsStrategy';

export class CostComparisonTool {
  private configService: ConfigService;
  private chainOperationsFactory: ChainOperationsFactory;
  private csvService: CsvWriterService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.chainOperationsFactory = new ChainOperationsFactory(
      this.configService
    );
    this.csvService = new CsvWriterService();
  }

  public async run(
    chains: SupportedChain[],
    selectedOperations: SupportedOperation[]
  ): Promise<FullTransactionResult[]> {
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

    const csvRows: CsvRow[] = results.map((result) => ({
      chain: result.chain,
      operation: result.operation,
      usdCost: result.usdCost,
      transactionHash: result.transactionHash,
      nativeCurrencySymbol: result.nativeCurrencySymbol,
      status: result.status,
      timestamp: result.timestamp,
    }));

    const csvPath = this.csvService.saveCsv('results', csvRows);
    
    return results;
  }

  private async executeSequentialOperations(
    chainOperationsList: Array<{
      chainId: SupportedChain;
      chainOperations: IChainOperations;
    }>,
    selectedOperations: SupportedOperation[]
  ): Promise<FullTransactionResult[]> {
    // One Promise per chain
    const perChainPromises = chainOperationsList.map(
      async ({ chainId, chainOperations }) => {
        const chainResults: FullTransactionResult[] = [];

        for (const selectedOperation of selectedOperations) {
          try {
            console.log(`Running ${selectedOperation} on ${chainId}`);
            const result = await ChainOperationsStrategy.executeOperation(
              selectedOperation,
              chainOperations
            );
            chainResults.push(result);
          } catch (error) {
            console.error(
              `Error executing ${selectedOperation} on ${chainId}:`,
              error
            );
          }
        }

        return chainResults;
      }
    );

    // Run all chains in parallel, await results
    const nestedResults = await Promise.all(perChainPromises);

    return nestedResults.flat();
  }
}
