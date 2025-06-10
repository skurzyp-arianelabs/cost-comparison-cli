import minimist from 'minimist';
import { z } from 'zod';
import { SupportedChain, SupportedMethod } from '../types';

const rawArgs = minimist(process.argv.slice(2));

const cliSchema = z.object({
  network: z.enum(['testnet', 'mainnet']).default('testnet'),

  chains: z
    .string()
    .transform((val) => val.split(','))
    .refine(
      (chains) =>
        chains.every((chain) =>
          Object.values(SupportedChain).includes(chain as SupportedChain)
        ),
      {
        message: `Invalid chain provided. Allowed chains: ${Object.values(SupportedChain).join(', ')}`,
      }
    ),

  methods: z
    .string()
    .transform((val) => val.split(','))
    .refine(
      (methods) =>
        methods.every((method) =>
          Object.values(SupportedMethod).includes(method as SupportedMethod)
        ),
      {
        message: `Invalid method provided. Allowed methods: ${Object.values(SupportedMethod).join(', ')}`,
      }
    ),
});

const parsed = cliSchema.safeParse(rawArgs);

if (!parsed.success) {
  console.error('Invalid CLI arguments:\n', parsed.error.format());
  process.exit(1);
}

export const cliConfig = parsed.data;
