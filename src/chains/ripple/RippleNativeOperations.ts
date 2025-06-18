import { AccountSetAsfFlags, Client, convertStringToHex, SubmittableTransaction, TxResponse, Wallet } from "xrpl";
import { IRippleNativeOperations } from "./IRippleNativeOperations";
import { RippleWalletCredentials } from "../../types";
import { ConfigService } from "../../services/ConfigService/ConfigService";
import { get900BytesMessage } from "../../utils/utils";

export class RippleNativeOperations implements IRippleNativeOperations {
    private readonly rippleClient: Client;
    private readonly rippleWalletCredentials: RippleWalletCredentials;
    private readonly rippleWallet: Wallet;
    private readonly rippleWallet2: Wallet;
    // Token code for custom token issuance in hexadecimal format (represents "MYTOK")
    private readonly TOKEN_CODE = "4D59544F4B000000000000000000000000000000";
    private walletsInitialized: boolean = false;

    constructor(private configService: ConfigService, rippleClient: Client) {
        this.rippleClient = rippleClient;
        this.rippleWalletCredentials = this.configService.getRippleWalletCredentials();
        this.rippleWallet = this.getWallet();
        this.rippleWallet2 = this.createNextWallet(1);
    }

    private createNextWallet(index: number): Wallet {
        // Create new wallet with next derivation path
        const derivationPath = `m/44'/144'/1'/0/${index}`; // Increment account index from 0 to 1
        return Wallet.fromMnemonic(this.rippleWalletCredentials.mnemonic!, 
            { derivationPath });
    }

    async initWallets() {
        if (this.walletsInitialized) {
            return;
        }

        await this.rippleClient.connect();
        // Prepare payment transaction
        const paymentTx = await this.rippleClient.autofill({
          TransactionType: "Payment",
          Account: this.rippleWallet.address,
          Destination: this.rippleWallet2.address, 
          Amount: "1000000" // 1 XRP = 1,000,000 drops
        });
    
        // Submit and wait for validation
        await this.rippleClient.submitAndWait(paymentTx, {
          wallet: this.rippleWallet
        });

        await this.rippleClient.disconnect();
    }


    private getWallet(): Wallet {
        return Wallet.fromMnemonic(this.rippleWalletCredentials.mnemonic!);
    }

    private async enableRippling() {
        await this.rippleClient.connect();
        const wallet = await this.rippleClient.fundWallet(this.rippleWallet);
        const account = wallet.wallet;

        const issuerSettings = await this.rippleClient.autofill({
            "TransactionType": "AccountSet",
            "Account": account.address,
            "SetFlag": AccountSetAsfFlags.asfDefaultRipple
        });

        const txResponse = await this.rippleClient.submitAndWait(issuerSettings, { wallet: account });
        await this.rippleClient.disconnect();
        return txResponse;
    }

  async createNativeFT(): Promise<TxResponse<SubmittableTransaction>> {
    return await this.enableRippling();
  }

  async associateNativeFT(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.rippleClient.connect();
    // Create trustline for the token
    const trustSetTx = await this.rippleClient.autofill({
      TransactionType: "TrustSet",  
      Account: this.rippleWallet2.address,
      LimitAmount: {
        currency: this.TOKEN_CODE,
        issuer: this.rippleWallet.address,
        value: "1000000000" // Set high limit for testing
      }
    });

    // Submit and wait for validation
    const trustSetResponse = await this.rippleClient.submitAndWait(trustSetTx, {
      wallet: this.rippleWallet2
    });

    await this.rippleClient.disconnect();
    return trustSetResponse;
  }

  async mintNativeFT(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.enableRippling();
    await this.associateNativeFT();
    await this.rippleClient.connect();

    // Mint & Transfer 100 tokens
    // NOTE: This is where the token is actually created!
    // In XRPL, tokens are created implicitly when the first payment transaction is executed
    // that sends tokens from the issuer to another account
    const paymentTx = await this.rippleClient.autofill({
        TransactionType: "Payment",
        Account: this.rippleWallet.address,
        Amount: {
          currency: this.TOKEN_CODE,
          issuer: this.rippleWallet.address,
          value: "100",
        },
        Destination: this.rippleWallet2.address,
      });

    // Submit and wait for validation
    const paymentResponse = await this.rippleClient.submitAndWait(paymentTx, {
      wallet: this.rippleWallet
    });

    await this.rippleClient.disconnect();
    return paymentResponse;
  }

  async transferNativeFT(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.enableRippling();
    await this.associateNativeFT();
    await this.mintNativeFT();
    await this.rippleClient.connect();

    const transferTx = await this.rippleClient.autofill({
        TransactionType: "Payment",
        Account: this.rippleWallet.address,
        Amount: {
          currency: this.TOKEN_CODE,
          issuer: this.rippleWallet.address,
          value: "100",
        },
        Destination: this.rippleWallet2.address,
      });

    // Submit and wait for validation
    const transferResponse = await this.rippleClient.submitAndWait(transferTx, {
      wallet: this.rippleWallet
    });

    await this.rippleClient.disconnect();
    return transferResponse;
  }

  async mintNativeNFT(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.rippleClient.connect();
    const nftMintTx = await this.rippleClient.autofill({
        TransactionType: "NFTokenMint",
        Account: this.rippleWallet.address,
        URI: convertStringToHex("https://example.com/nft"),
        Flags: 8,
        NFTokenTaxon: 0,
      });
      const signedNftMint = this.rippleWallet.sign(nftMintTx);
      const nftMintResult = await this.rippleClient.submitAndWait(signedNftMint.tx_blob);
      await this.rippleClient.disconnect();
      return nftMintResult;
  }

  async createNFTCreateOffer(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.rippleClient.connect();
    const nftokens = await this.rippleClient.request({
        command: "account_nfts",
        account: this.rippleWallet.address,
    });
    const nftTokenId = nftokens.result.account_nfts[0]!.NFTokenID;
    
    // Create a sell offer
    const nftOfferTx = await this.rippleClient.autofill({
        TransactionType: "NFTokenCreateOffer",
        Account: this.rippleWallet.address,
        NFTokenID: nftTokenId,
        Amount: "0",
        Destination: this.rippleWallet2.address,
        Flags: 1, // sell offer
    });
    const signedNftOffer = this.rippleWallet.sign(nftOfferTx);
    const nftOfferResult = await this.rippleClient.submitAndWait(signedNftOffer.tx_blob);
    await this.rippleClient.disconnect();
    return nftOfferResult;
  }

  async transferNativeNFT(offerId: string): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.rippleClient.connect();
    const acceptOfferTx = await this.rippleClient.autofill({
        TransactionType: "NFTokenAcceptOffer",
        Account: this.rippleWallet2.address,
        NFTokenSellOffer: offerId,
    });
    const signedAcceptOffer = this.rippleWallet2.sign(acceptOfferTx);
    const acceptOfferResult = await this.rippleClient.submitAndWait(signedAcceptOffer.tx_blob);
    await this.rippleClient.disconnect();
    return acceptOfferResult;
  }

  async hcsSubmitMessage(): Promise<TxResponse<SubmittableTransaction>> {
    await this.initWallets();
    await this.rippleClient.connect();
    const memoTx = await this.rippleClient.autofill({
      TransactionType: "Payment",
      Account: this.rippleWallet.address,
      Destination: this.rippleWallet2.address,
      Amount: "1", // 1 XRP (1M drops)
      Memos: [
        {
          Memo: {
            MemoData: convertStringToHex(get900BytesMessage()),
          },
        },
      ],
    });
    const signedMemo = this.rippleWallet.sign(memoTx);
    const memoResult = await this.rippleClient.submitAndWait(signedMemo.tx_blob);
    await this.rippleClient.disconnect();
    return memoResult;
  }
}