import {
  verifyTeeRpcIntegrity,
  getAuthToken,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { TEE_BASE_URL } from "./config";

/**
 * Verify TEE RPC integrity then build `https://tee.magicblock.app?token=...` for Private ER.
 * `ephemeralRpcUrl` should be the ER HTTP endpoint you delegate against (e.g. devnet.magicblock.app).
 */
export async function connectPrivateTee(
  ephemeralRpcUrl: string,
  walletPubkey: import("@solana/web3.js").PublicKey,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<{ teeHttpUrl: string; token: string }> {
  await verifyTeeRpcIntegrity(ephemeralRpcUrl);
  const { token } = await getAuthToken(
    ephemeralRpcUrl,
    walletPubkey,
    async (message: Uint8Array) => {
      const sig = await signMessage(message);
      return sig;
    }
  );
  const url = new URL(TEE_BASE_URL);
  url.searchParams.set("token", token);
  return { teeHttpUrl: url.toString(), token };
}
