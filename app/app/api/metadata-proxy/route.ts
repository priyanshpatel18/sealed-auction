import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Hosts allowed to fetch JSON metadata (IPFS gateways). */
function isAllowedMetadataUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".ipfs.dweb.link")) return true;
  if (host.endsWith(".ipfs.w3s.link")) return true;
  if (host === "ipfs.io") return true;
  if (host === "gateway.pinata.cloud") return true;
  if (host.endsWith("mypinata.cloud")) return true;
  if (host.endsWith("pinata.cloud")) return true;
  if (host === "cloudflare-ipfs.com") return true;
  if (host.endsWith("nftstorage.link")) return true;
  if (host.endsWith("magicblock.app")) return true;
  return false;
}

/**
 * Server-side fetch for IPFS metadata JSON (avoids browser CORS on some gateways).
 * GET ?url=https%3A%2F%2Fgateway...
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw?.trim()) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!isAllowedMetadataUrl(target)) {
    return NextResponse.json({ error: "URL host not allowed" }, { status: 403 });
  }

  const res = await fetch(target.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream ${res.status}` },
      { status: 502 }
    );
  }
  const text = await res.text();
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 502 });
  }
}
