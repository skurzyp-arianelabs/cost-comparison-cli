import { ChainClientFactory } from '../chains/factories/ChainClientFactory';
import { ConfigService } from './ConfigService/ConfigService';
import { IChainClient } from '../chains/IChainClient';
import {
  SupportedChain,
  SupportedOperation,
  TransactionResult,
} from '../types';

export class CostComparisonTool {
  private configService: ConfigService;
  private chainClientFactory: ChainClientFactory;

  constructor() {
    this.configService = new ConfigService();
    this.chainClientFactory = new ChainClientFactory(this.configService);
  }

  public async run(
    chains: SupportedChain[],
    operations: SupportedOperation[]
  ): Promise<void> {
    // Create clients
    const clients = chains.map((chainType) => ({
      chainId: chainType,
      client: this.chainClientFactory.createClient(chainType),
    }));

    console.log('Checking chain connectivity...');
    const healthChecks = await Promise.all(
      clients.map(async ({ chainId, client }) => ({
        chainId,
        healthy: await client.isHealthy(),
      }))
    );

    const unhealthyChains = healthChecks.filter((hc) => !hc.healthy);
    if (unhealthyChains.length > 0) {
      console.warn(
        `⚠️  Warning: Some chains are not responding: ${unhealthyChains.map((hc) => hc.chainId).join(', ')}`
      );
    }

    const healthyClients = clients.filter(
      ({ chainId }) =>
        healthChecks.find((hc) => hc.chainId === chainId)?.healthy
    );

    if (healthyClients.length === 0) {
      throw new Error('No healthy chains available');
    }

    console.log(
      `🚀 Executing ${operations.length} operations across ${healthyClients.length} chains`
    );

    //TODO: currently runs given operations only once for each given chain. Should support setting number of executions
    const results = await this.executeConcurrentOperations(clients, operations);
    console.log(JSON.stringify(results, null, 2));
  }

  private async executeConcurrentOperations(
    clients: Array<{
      chainId: string;
      client: IChainClient;
    }>,
    operations: SupportedOperation[]
  ): Promise<TransactionResult[]> {
    const promises = clients.flatMap(({ client }) =>
      operations.map((operation) => client.executeOperation(operation))
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter(
        (result): result is PromiseFulfilledResult<TransactionResult> =>
          result.status === 'fulfilled'
      )
      .map((result) => result.value);
  }
}
