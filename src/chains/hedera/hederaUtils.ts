import {
  HederaKeyType,
  HederaMirrorNodeService,
} from '../../services/ApiService/HederaMirrorNodeService';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

/**
 * Returns an EVM-compatible address for the given Hedera account.
 * If the account uses an ECDSA key, returns the Solidity address.
 * Otherwise, fetches the EVM address from the mirror node.
 *
 * @param mirrorNodeService An instance of HederaMirrorNodeService
 * @param accountId The Hedera AccountId to resolve
 * @returns EVM-compatible address as a hex string
 */
export async function getEvmCompatibleAddress(
  mirrorNodeService: HederaMirrorNodeService,
  accountId: AccountId
): Promise<string> {
  const keyType = await mirrorNodeService.getAccountType(accountId);

  if (keyType === HederaKeyType.ED25519) {
    return accountId.toSolidityAddress();
  }

  return await mirrorNodeService.getEvmAddress(accountId);
}

export function parseDerKeyToHex(derKey: string): `0x${string}` {
  const der = PrivateKey.fromStringDer(derKey);
  const raw = der.toBytesRaw();

  const hex = Buffer.from(raw).toString('hex').padStart(64, '0');
  return `0x${hex}`;
}
