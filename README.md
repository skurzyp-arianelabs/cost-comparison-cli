# 📊 Cost Comparison Tool

This tool executes multiple on-chain transactions across different blockchain networks and generates a comprehensive cost comparison report.

## ✅ Supported Chains

Currently, six chains are supported. The modular architecture makes it easy to integrate additional chains.

### Available Chains:
- **Hedera** (Native + EVM support)
- **Avalanche** (EVM only)
- **Optimism** (EVM only)
- **Solana** (Native only)
- **Stellar** (Native only)
- **Ripple** (Native only)

Each chain supports both `mainnet` and `testnet`. However, due to inconsistencies in network naming across ecosystems (e.g., Solana's *devnet* aligns with what other chains call *testnet*), the app assumes that a *testnet* replicates the *mainnet*'s node version and protocol features.

### Chain Identifiers:
```bash
avalanche
hedera
solana
ripple
stellar
optimism
```

### Network Types:
```bash
mainnet
testnet
```

> **Note:** For Solana, `Devnet` corresponds to:
> ```bash
> pnpm start --network=testnet --chains=solana ...
> ```
> [TODO: validate this mapping]

---

## ⚙️ Supported Operations

Operations are categorized into four groups:

### 1. Native Token Operations

Native token operations leverage each chain's own token standards (non-EVM). Supported on: Hedera, Solana, Ripple, and Stellar.

**Action Slugs:**
```bash
create-native-ft
associate-native-ft
mint-native-ft
transfer-native-ft
create-native-nft
associate-native-nft
mint-native-nft
transfer-native-nft
```

> ⚠️ Some native operations (e.g., token association on Stellar) may not be fully supported.
> [TODO: confirm support details]

---

### 2. EVM-Based Token Operations

These operations use ERC-20 and ERC-721 standards. Implemented via:

* **JSON RPC**
* **SDKs** (e.g., Hedera Hashgraph SDK)

**Action Slugs:**
```bash
deploy-erc20-hardhat
mint-erc20-hardhat
transfer-erc20-hardhat
deploy-erc20-sdk
mint-erc20-sdk
transfer-erc20-sdk
deploy-erc721-hardhat
mint-erc721-hardhat
transfer-erc721-hardhat
deploy-erc721-sdk
mint-erc721-sdk
transfer-erc721-sdk
```

> **Note:** Avalanche and Optimism use the same cost for both SDK and JSON RPC deployments.
> Therefore for example, `deploy-erc721-sdk` is executed for both SDK and JSON RPC.

---

### 3. Message Submissions

This simulates submitting a message on-chain.

* **Hedera:** Uses native HCS (Hedera Consensus Service) topics.
* **Other chains:** Simulates message submission via token transfers, including a small payload.

**Action Slug:**
```bash
hcs-message-submit
```

* **Message size:** 900 bytes on most chains.
* **Stellar exception:** Max memo size is 28 bytes.
  [TODO: confirm limit]

---

### 4. Special Handling Cases
The following table demonstrates how we handle special cases where native blockchain functionality or EVM-compatible actions are not fully supported:

| Chain         | Scenario                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **Avalanche** | No native tokens. Native ops (e.g. `transfer-native-ft`) use ERC-20 tokens instead.                      |
| **Optimism**  | No native tokens. Operations like `associate-native-ft` are not supported and will throw a handled error. |
| **Solana**    | No EVM compatibility. EVM-style ops deploy native Solana tokens via Solana Token Program.                |
| **Avalanche** | No distinction in cost between JSON RPC and SDK ops. Only one implementation is executed.                |

---

## 🚀 Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/skurzyp-arianelabs/cost-comparison-cli.git
   ```

2. **Create the `.env` file**
   ```bash
   cp .env.example .env
   ```
   Then configure all required environment variables.

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Run the CLI app**

   Select a network type (`mainnet`, `testnet`), chains, and operations to test.

   **Example:** Run all actions on Hedera and Solana testnets:
   ```bash
   pnpm start \
     --network=testnet \
     --chains=hedera,solana \
     --operations=\
   create-native-ft,\
   associate-native-ft,\
   mint-native-ft,\
   transfer-native-ft,\
   create-native-nft,\
   associate-native-nft,\
   mint-native-nft,\
   transfer-native-nft,\
   deploy-erc20-hardhat,\
   mint-erc20-hardhat,\
   transfer-erc20-hardhat,\
   deploy-erc20-sdk,\
   mint-erc20-sdk,\
   transfer-erc20-sdk,\
   deploy-erc721-hardhat,\
   mint-erc721-hardhat,\
   transfer-erc721-hardhat,\
   deploy-erc721-sdk,\
   mint-erc721-sdk,\
   transfer-erc721-sdk,\
   hcs-message-submit
   ```

---

## 🛠 Chain Configuration

Chains are configured in `./src/services/ConfigService/ChainsConfig.ts`.

* **EVM Chains**: Use presets from `@viem/chains`.
* **Others**: Manually configured.

**Example: Ripple Testnet Configuration**
```typescript
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
```

Update RPC URLs here if any are deprecated or unavailable.

---

## ⚠️ Known Issues and Limitations

### 1. CoinGecko API Rate Limiting

Token prices are fetched via CoinGecko's free API, which has strict request limits per minute. This may cause failures if:

* Too many chains are selected.
* The app is rerun quickly.

**Optimization:** Each token's price is fetched once per session to minimize requests.
However, prices may be a few minutes old for later operations.

---

### 2. Sequential Operation Execution

Due to nonce constraints in EVM-compatible chains, transactions per chain must run sequentially. This ensures nonce consistency and proper submission order.

**However**, different chains run in parallel to optimize overall performance.