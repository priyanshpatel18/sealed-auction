/** Normalize RPC URL for comparison (trailing slashes, case). */
export function normalizeSolanaRpcUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

export function rpcUrlsEquivalent(a: string, b: string): boolean {
  return normalizeSolanaRpcUrl(a) === normalizeSolanaRpcUrl(b);
}

/** Human-readable warning when wallet connection RPC ≠ app `NEXT_PUBLIC_BASE_RPC`. */
export function walletRpcMismatchMessage(
  activeRpc: string,
  configuredBaseRpc: string
): string | null {
  if (rpcUrlsEquivalent(activeRpc, configuredBaseRpc)) return null;
  return `Your wallet is using a different RPC than the app default (NEXT_PUBLIC_BASE_RPC). On-chain reads use the wallet RPC — mismatches often explain “account not found.” Default: ${configuredBaseRpc}`;
}
