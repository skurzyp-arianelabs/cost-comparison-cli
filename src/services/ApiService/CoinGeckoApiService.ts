import { z } from 'zod';
import { ConfigService } from '../ConfigService/ConfigService';

const priceResponseSchema = z.object({
  usd: z.number(),
});

export class CoinGeckoApiService {
  constructor(private configService: ConfigService) {}

  private async fetchUsdPrice(tokenId: string): Promise<number> {
    const apiKey = this.configService.getCoinGeckoApiKey();
    const baseUrl = 'https://api.coingecko.com/api/v3/simple/price';
    const url = `${baseUrl}?ids=${tokenId}&vs_currencies=usd`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey; // or use 'x-cg-pro-api-key' for Pro
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch price for ${tokenId} (status ${response.status}). Body: ${errorBody}. ` +
        `TIP: CoinGecko API rate limiting may be involved. Try adding or rotating COINGECKO_API_KEY.`
      );
    }

    const json = await response.json();

    const validated = priceResponseSchema.safeParse(json[tokenId]);
    if (!validated.success) {
      throw new Error(`Unexpected response shape for ${tokenId}: ${JSON.stringify(json)}`);
    }

    return validated.data.usd;
  }

  async getHbarPriceInUsd() {
    return this.fetchUsdPrice('hedera-hashgraph');
  }

  async getSolPriceInUsd() {
    return this.fetchUsdPrice('solana');
  }

  async getRipplePriceInUsd() {
    return this.fetchUsdPrice('ripple');
  }

  async getStellarPriceInUsd() {
    return this.fetchUsdPrice('stellar');
  }

  async getEthPriceInUsd() {
    return this.fetchUsdPrice('ethereum');
  }

  async getAvaxPriceInUsd() {
    return this.fetchUsdPrice('avalanche-2');
  }
}
