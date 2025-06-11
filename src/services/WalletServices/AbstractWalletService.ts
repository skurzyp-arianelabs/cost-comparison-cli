import { ConfigService } from '../ConfigService';
import { AccountData, NetworkType, SupportedChain } from '../../types';

export abstract class AbstractWalletService {
  protected configService: ConfigService;
  protected client: any;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.client = this.initClient();
  }

  protected abstract initClient(): any;

  public abstract getClient(): any;

  public abstract createAccountAndReturnClient(
    autoAssociation?: number
  ): Promise<any>;

  public abstract createAccount(autoAssociation?: number): Promise<AccountData>;

  protected abstract createClient(
    networkType: NetworkType,
    address: string,
    privateKey: string
  ): any;

  protected abstract getSupportedChain(): SupportedChain;
}
