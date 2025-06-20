# Cost Comparison Tool
## Setup
1. set envs

1. Set up Google Cloud credentials:
   - Go to Google Cloud Console
   - Create a new project or select an existing one
   - Enable Google Sheets API
   - Create a service account and download the credentials JSON file
   - Place the credentials file in a secure location

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     - TODO: WALLET_HEDERA_PRIVATE_KEY, WALLET_HEDERA_ADDRESS, WALLET_SOLANA_PRIVATE_KEY, NETWORK_TYPE, WALLET_STELLAR_PRIVATE_KEY
     - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account credentials JSON file
     - `SPREADSHEET_ID` (optional): ID of an existing spreadsheet to update

2. run 
```
pnpm start \
  --network=testnet \
  --chains=hedera \
  --operations=\
create-native-ft,\
associate-native-ft,\
mint-native-ft,\
transfer-native-ft,\
create-native-nft,\
associate-native-nft,\
mint-native-nft,\
transfer-native-nft,\
deploy-erc20-json-rpc,\
mint-erc20-json-rpc,\
transfer-erc20-json-rpc,\
deploy-erc20-sdk,\
mint-erc20-sdk,\
transfer-erc20-sdk,\
deploy-erc721-json-rpc,\
mint-erc721-json-rpc,\
transfer-erc721-json-rpc,\
deploy-erc721-sdk,\
mint-erc721-sdk,\
transfer-erc721-sdk,\
submit-message

```