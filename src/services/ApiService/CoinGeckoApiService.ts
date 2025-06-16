import { z } from 'zod';

const hbarPriceResponse = z.object({
  'hedera-hashgraph': z.object({ usd: z.number() }),
});

const solPriceResponse = z.object({
  solana: z.object({ usd: z.number() }),
});

const stellarPriceResponse = z.object({
  stellar: z.object({ usd: z.number() }),
});

export class CoinGeckoApiService {
  async getHbarPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error('Coingecko response for hedera is not valid');
    }

    return hbarPriceResponse.parse(await response.json());
  }

  async getSolPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error('Coingecko response for solana is not valid');
    }

    return solPriceResponse.parse(await response.json());
  }

  async getStellarPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error('Coingecko response for stellar is not valid');
    }

    return stellarPriceResponse.parse(await response.json());
  }
}
