/** Map app RPC URL to Solana Explorer `cluster` query value. */
export type ExplorerCluster =
  | "devnet"
  | "mainnet-beta"
  | "testnet"
  | "custom";

export function explorerClusterFromRpc(rpcUrl: string): ExplorerCluster {
  const u = rpcUrl.toLowerCase();
  if (u.includes("devnet")) return "devnet";
  if (u.includes("mainnet")) return "mainnet-beta";
  if (u.includes("testnet")) return "testnet";
  return "custom";
}

export function solanaExplorerAddressUrl(
  address: string,
  cluster: ExplorerCluster
): string {
  const base = `https://explorer.solana.com/address/${address}`;
  return cluster === "custom"
    ? `${base}?cluster=custom`
    : `${base}?cluster=${cluster}`;
}

export function solanaExplorerTxUrl(
  signature: string,
  cluster: ExplorerCluster
): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  return cluster === "custom"
    ? `${base}?cluster=custom`
    : `${base}?cluster=${cluster}`;
}
