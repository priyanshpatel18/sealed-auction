/** UI status for badges (on-chain cards derive this from phase + time). */
export type AuctionStatus = "live" | "ending_soon" | "ended";

export function isLiveStatus(s: AuctionStatus): boolean {
  return s === "live" || s === "ending_soon";
}
