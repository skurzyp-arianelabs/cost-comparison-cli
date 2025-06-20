import { ConfigService } from '../ConfigService/ConfigService';
import { AccountId } from '@hashgraph/sdk';
import axios, { AxiosInstance } from 'axios';

export enum HederaKeyType {
  ECDSA_SECP256K1 = 'ECDSA_SECP256K1',
  ED25519 = 'ED25519',
}

export class HederaMirrorNodeService {
  private networkType: string;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(configService: ConfigService) {
    this.networkType = configService.getNetworkType();
    switch (this.networkType) {
      case 'mainnet':
        this.baseUrl = 'https://mainnet.mirrornode.hedera.com/api/v1';
        break;
      case 'testnet':
        this.baseUrl = 'https://testnet.mirrornode.hedera.com/api/v1';
        break;
      default:
        throw new Error('Unsupported or undefined network type for Hedera!');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: 'application/json',
      },
    });
  }

  async getAccountType(accountId: AccountId): Promise<HederaKeyType> {
    const id = accountId.toString();
    try {
      const response = await this.axiosInstance.get(`/accounts/${id}`);
      const keyType = response.data?.key?._type;

      if (
        keyType === HederaKeyType.ECDSA_SECP256K1 ||
        keyType === HederaKeyType.ED25519
      ) {
        return keyType;
      } else {
        throw new Error(`Unknown key type: ${keyType}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch account info: ${(error as Error).message}`
      );
    }
  }

  async getEvmAddress(accountId: AccountId): Promise<string> {
    const id = accountId.toString();
    try {
      const response = await this.axiosInstance.get(`/accounts/${id}`);
      const evmAddress = response.data?.evm_address;

      if (evmAddress) {
        return evmAddress;
      } else {
        throw new Error(`EVM address not found for account ${id}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch EVM address: ${(error as Error).message}`
      );
    }
  }
}
