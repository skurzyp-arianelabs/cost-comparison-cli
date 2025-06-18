import { z } from 'zod';

const coinGeckoSchemas = {
  'hedera-hashgraph': z.object({ 'hedera-hashgraph': z.object({ usd: z.number() }) }),
  'solana': z.object({ 'solana': z.object({ usd: z.number() }) }),
};

export class CoinGeckoApiService {
  async getPriceInUsd<T>(tokenId: string, schema: z.ZodType<T>): Promise<T> {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tokenId} price`);
    }

    const json = await response.json();
    return schema.parse(json);
  }

  async getHbarPriceInUsd() {
    return this.getPriceInUsd('hedera-hashgraph', coinGeckoSchemas['hedera-hashgraph']);
  }

  async getSolPriceInUsd() {
    return this.getPriceInUsd('solana', coinGeckoSchemas['solana']);
  }
}
