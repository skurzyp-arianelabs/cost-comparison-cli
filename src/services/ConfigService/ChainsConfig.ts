import {
  avalanche,
  avalancheFuji,
  hedera,
  hederaTestnet,
  optimism,
  optimismSepolia,
} from 'viem/chains';
import { ExtendedChain, NetworkType, SupportedChain } from '../../types';

const solanaDevnet: ExtendedChain = {
  id: 10000, // internal chain id - Solana does not have it's unique EVM chain id as it is not EVM compatible
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
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://solscan.io' },
  },
  contracts: {},
};

const solanaMainnet: ExtendedChain = {
  id: 10001, // internal ID
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
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://solscan.io' },
  },
  contracts: {},
};

const rippleMainnet: ExtendedChain = {
  id: 10002, // internal ID
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
  blockExplorers: {
    default: { name: 'XRPScan', url: 'https://xrpscan.com' },
  },
  contracts: {},
};

const rippleTestnet: ExtendedChain = {
  id: 10005, // internal ID
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
  blockExplorers: {
    default: { name: 'XRPScan Testnet', url: 'https://testnet.xrpscan.com' },
  },
  contracts: {},
};

const stellarMainnet: ExtendedChain = {
  id: 10003, // internal ID
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
  blockExplorers: {
    default: {
      name: 'StellarExpert',
      url: 'https://stellar.expert/explorer/public',
    },
  },
  contracts: {},
};

const stellarTestnet: ExtendedChain = {
  id: 10004, // internal ID
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
  blockExplorers: {
    default: {
      name: 'StellarExpert Testnet',
      url: 'https://stellar.expert/explorer/testnet',
    },
  },
  contracts: {},
};

export const initSupportedChains = (): ExtendedChain[] => {
  return [
    {
      ...avalanche,
      type: SupportedChain.AVALANCHE,
      network: NetworkType.MAINNET,
    },
    {
      ...avalancheFuji,
      type: SupportedChain.AVALANCHE,
      network: NetworkType.TESTNET,
    },
    {
      ...hedera,
      type: SupportedChain.HEDERA,
      network: NetworkType.MAINNET,
    },
    {
      ...hederaTestnet,
      type: SupportedChain.HEDERA,
      network: NetworkType.TESTNET,
    },
    {
      ...optimism,
      type: SupportedChain.OPTIMISM,
      network: NetworkType.MAINNET,
    },
    {
      ...optimismSepolia,
      type: SupportedChain.OPTIMISM,
      network: NetworkType.TESTNET,
    },
    solanaDevnet,
    solanaMainnet,
    stellarTestnet,
    stellarMainnet,
    rippleTestnet,
    rippleMainnet,
  ];
};
