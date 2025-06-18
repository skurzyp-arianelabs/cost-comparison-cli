import {
  avalanche,
  avalancheFuji,
  hedera,
  hederaTestnet,
  optimism,
  optimismSepolia,
} from 'viem/chains';
import { ChainConfig, NetworkType, SupportedChain } from '../../types';
import { Chain } from 'viem';

export function mapViemChainToConfig(
  chain: Chain,
  type: SupportedChain,
  network: NetworkType
): ChainConfig {
  return {
    type,
    network,
    name: chain.name,
    nativeCurrency: {
      decimals: chain.nativeCurrency.decimals,
      name: chain.nativeCurrency.name,
      symbol: chain.nativeCurrency.symbol,
    },
    rpcUrls: {
      default: {
        http: chain.rpcUrls.default.http as string[],
      },
    },
  };
}

const solanaDevnet: ChainConfig = {
  name: 'Solana Devnet',
  type: SupportedChain.SOLANA,
  network: NetworkType.TESTNET,
  nativeCurrency: {
    decimals: 9,
    name: 'Solana',
    symbol: 'SOL',
  },
  rpcUrls: {
    default: {
      http: ['https://api.devnet.solana.com'],
    },
  },
};

const solanaMainnet: ChainConfig = {
  type: SupportedChain.SOLANA,
  network: NetworkType.MAINNET,
  name: 'Solana Mainnet',
  nativeCurrency: {
    decimals: 9,
    name: 'Solana',
    symbol: 'SOL',
  },
  rpcUrls: {
    default: {
      http: ['https://api.mainnet-beta.solana.com'],
    },
  },
};

const rippleMainnet: ChainConfig = {
  type: SupportedChain.RIPPLE,
  network: NetworkType.MAINNET,
  name: 'Ripple Mainnet',
  nativeCurrency: {
    decimals: 6,
    name: 'XRP',
    symbol: 'XRP',
  },
  rpcUrls: {
    default: {
      http: ['https://s1.ripple.com:51234'],
    },
  },
};

const rippleTestnet: ChainConfig = {
  type: SupportedChain.RIPPLE,
  network: NetworkType.TESTNET,
  name: 'Ripple Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'Test XRP',
    symbol: 'TXRP',
  },
  rpcUrls: {
    default: {
      http: ['https://s.altnet.rippletest.net:51234'],
    },
  },
};

const stellarMainnet: ChainConfig = {
  type: SupportedChain.STELLAR,
  network: NetworkType.MAINNET,
  name: 'Stellar Mainnet',
  nativeCurrency: {
    decimals: 7,
    name: 'Lumen',
    symbol: 'XLM',
  },
  rpcUrls: {
    default: {
      http: ['https://horizon.stellar.org'],
    },
  },
};

const stellarTestnet: ChainConfig = {
  type: SupportedChain.STELLAR,
  network: NetworkType.TESTNET,
  name: 'Stellar Testnet',
  nativeCurrency: {
    decimals: 7,
    name: 'Test Lumen',
    symbol: 'TXLM',
  },
  rpcUrls: {
    default: {
      http: ['https://horizon-testnet.stellar.org'],
    },
  },
};

export const initSupportedChains = (): ChainConfig[] => {
  return [
    mapViemChainToConfig(
      avalanche,
      SupportedChain.AVALANCHE,
      NetworkType.MAINNET
    ),
    mapViemChainToConfig(
      avalancheFuji,
      SupportedChain.AVALANCHE,
      NetworkType.TESTNET
    ),
    mapViemChainToConfig(hedera, SupportedChain.HEDERA, NetworkType.MAINNET),
    mapViemChainToConfig(
      hederaTestnet,
      SupportedChain.HEDERA,
      NetworkType.TESTNET
    ),
    mapViemChainToConfig(
      optimism,
      SupportedChain.OPTIMISM,
      NetworkType.MAINNET
    ),
    mapViemChainToConfig(
      optimismSepolia,
      SupportedChain.OPTIMISM,
      NetworkType.TESTNET
    ),
    solanaDevnet,
    solanaMainnet,
    stellarTestnet,
    stellarMainnet,
    rippleTestnet,
    rippleMainnet,
  ];
};
