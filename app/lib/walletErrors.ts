import { SendTransactionError } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { PROGRAM_ID } from "./config";

/** Map wallet / RPC errors to short UI copy (reject vs program failure). */
export function friendlyWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    /user rejected|rejected the request|approval denied|denied|cancelled|canceled/i.test(
      msg
    )
  ) {
    return "Transaction was rejected in your wallet.";
  }
  return msg;
}

/**
 * Richer messages for failed txs: user reject, missing program on cluster, simulation logs.
 */
export async function friendlyTxError(
  err: unknown,
  connection: Connection
): Promise<string> {
  const rej = friendlyWalletError(err);
  if (rej === "Transaction was rejected in your wallet.") return rej;

  let msg = err instanceof Error ? err.message : String(err);
  let extraLogs: string[] | undefined;

  if (err instanceof SendTransactionError) {
    try {
      extraLogs = await err.getLogs(connection);
    } catch {
      extraLogs = err.logs;
    }
  } else {
    const anyErr = err as { logs?: string[] };
    if (Array.isArray(anyErr.logs)) extraLogs = anyErr.logs;
  }

  if (
    /token_mint/i.test(msg) &&
    /AccountNotInitialized|3012|expected this account to be already initialized/i.test(
      msg
    )
  ) {
    const rpc = connection.rpcEndpoint;
    const lines = [
      "This error usually means the wallet simulated the transaction on a different cluster than your app RPC (e.g. Phantom on Mainnet while the app uses Devnet).",
      `App RPC: ${rpc}`,
      `Program id in this build: ${PROGRAM_ID.toBase58()}`,
      "Fix: In Phantom (or your wallet), switch the network to match the RPC — for https://api.devnet.solana.com choose Devnet. Then hard-refresh the page (or stop dev server, run `rm -rf .next`, `npm run dev`).",
      "If the wallet is already on the right cluster, the program at this address on that cluster may still be an old SPL-token build: run `anchor build && anchor deploy` to the same cluster, then `cd app && yarn sync-idl`.",
    ];
    if (extraLogs?.length) {
      lines.push("", "Logs:", ...extraLogs);
    }
    return lines.join("\n");
  }

  if (/program that does not exist|Could not find program/i.test(msg)) {
    const lines = [
      "This program is not deployed on the network your RPC uses (or the wallet is on a different cluster).",
      `Program id: ${PROGRAM_ID.toBase58()}`,
      "Fix: deploy with `anchor deploy` to that cluster, set NEXT_PUBLIC_BASE_RPC to the same cluster (e.g. https://api.devnet.solana.com for devnet), and switch your wallet to that network.",
    ];
    if (extraLogs?.length) {
      lines.push("", "Simulation logs:", ...extraLogs);
    }
    return lines.join("\n");
  }

  if (extraLogs?.length) {
    return [msg, "", "Logs:", ...extraLogs].join("\n");
  }

  return msg;
}
