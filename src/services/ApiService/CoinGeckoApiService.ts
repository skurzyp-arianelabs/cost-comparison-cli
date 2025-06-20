import { z } from 'zod';
import { ConfigService } from '../ConfigService/ConfigService';

const coinGeckoSchemas = {
  'hedera-hashgraph': z.object({
    'hedera-hashgraph': z.object({ usd: z.number() }),
  }),
  ethereum: z.object({ ethereum: z.object({ usd: z.number() }) }),
  solana: z.object({ solana: z.object({ usd: z.number() }) }),
  stellar: z.object({ stellar: z.object({ usd: z.number() }) }),
  'avalanche-2': z.object({ 'avalanche-2': z.object({ usd: z.number() }) }),
};

export class CoinGeckoApiService {
  constructor(private configService: ConfigService) {}

  async getPriceInUsd<T>(tokenId: string, schema: z.ZodType<T>): Promise<T> {
    const apiKey = this.configService.getCoinGeckoApiKey();
    const baseUrl = 'https://api.coingecko.com/api/v3';
    const apiKeyParam = apiKey ? `&x_cg_demo_api_key=${apiKey}` : '';
    const url = `${baseUrl}/simple/price?ids=${tokenId}&vs_currencies=usd${apiKeyParam}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${tokenId} price (status ${response.status}). The response body: ${await response.text()}. 
        NOTE: This issue might be caused by the CoinGecko API rate limiting. Please consider adding free COINGECKO_API_KEY.`
      );
    }

    const json = await response.json();
    return schema.parse(json);
  }

  async getHbarPriceInUsd() {
    return this.getPriceInUsd(
      'hedera-hashgraph',
      coinGeckoSchemas['hedera-hashgraph']
    );
  }

  async getSolPriceInUsd() {
    return this.getPriceInUsd('solana', coinGeckoSchemas['solana']);
  }

  async getStellarPriceInUsd() {
    return this.getPriceInUsd('stellar', coinGeckoSchemas['stellar']);
  }

  async getEthPriceInUsd() {
    return this.getPriceInUsd('ethereum', coinGeckoSchemas['ethereum']);
  }

  async getAvaxPriceInUsd() {
    return this.getPriceInUsd('avalanche-2', coinGeckoSchemas['avalanche-2']);
  }
}
