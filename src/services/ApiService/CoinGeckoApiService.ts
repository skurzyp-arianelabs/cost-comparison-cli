import { z } from "zod";

const hbarPriceResponse = z.object({
  'hedera-hashgraph': z.object({ usd: z.number() }),
});


const solPriceResponse = z.object({
  'solana': z.object({ usd: z.number() }),
});


const avaxPriceResponse = z.object({
  'avalanche-2': z.object({ usd: z.number() }),
});


export class CoinGeckoApiService {
  async getHbarPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error('Response is not valid');
    }

    return hbarPriceResponse.parse(await response.json());
  }

  async getSolPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    if (!response.ok) {
      throw new Error('Response is not valid');
    }

    return solPriceResponse.parse(await response.json());
  }

  async getAvaxPriceInUsd() {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      throw new Error('Response is not valid');
    }

    return avaxPriceResponse.parse(await response.json());
  }
}