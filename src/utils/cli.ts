import minimist from 'minimist';
import { z } from 'zod';
import { SupportedChain, SupportedOperation } from '../types';

const rawArgs = minimist(process.argv.slice(2));

const supportedChains = Object.values(SupportedChain);
const supportedOperations = Object.values(SupportedOperation);

const cliSchema = z.object({
  network: z.enum(['testnet', 'mainnet']).default('testnet'),

  chains: z
    .string()
    .transform((val) => (val === 'all' ? supportedChains : val.split(',')))
    .refine(
      (chains): chains is SupportedChain[] =>
        chains.every((chain) =>
          supportedChains.includes(chain as SupportedChain)
        ),
      {
        message: `Invalid chain provided. Allowed chains: ${supportedChains.join(', ')}`,
      }
    ),

  operations: z
    .string()
    .transform((val) => (val === 'all' ? supportedOperations : val.split(',')))
    .refine(
      (ops): ops is SupportedOperation[] =>
        ops.every((op) =>
          supportedOperations.includes(op as SupportedOperation)
        ),
      {
        message: `Invalid method provided. Allowed operations: ${supportedOperations.join(', ')}`,
      }
    ),
});

const parsed = cliSchema.safeParse(rawArgs);

if (!parsed.success) {
  console.error('Invalid CLI arguments:\n', parsed.error.format());
  process.exit(1);
}

export const cliConfig = parsed.data;
