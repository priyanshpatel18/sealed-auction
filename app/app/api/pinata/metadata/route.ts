import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  title?: string;
  description?: string;
  imageUrl?: string | null;
};

/**
 * Pin auction metadata JSON (title, description, optional cover image URL).
 */
export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt?.trim()) {
    return NextResponse.json(
      {
        error:
          "Missing PINATA_JWT. Add it to app/.env (Pinata → API Keys → JWT).",
      },
      { status: 501 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pinataContent: Record<string, string> = {
    title: body.title?.trim() || "",
    description: body.description?.trim() || "",
  };
  if (body.imageUrl?.trim()) {
    pinataContent.image = body.imageUrl.trim();
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent,
      pinataMetadata: { name: "auction-metadata.json" },
    }),
  });

  const data = (await res.json()) as {
    IpfsHash?: string;
    error?: { details?: string; reason?: string };
  };

  if (!res.ok) {
    const msg =
      typeof data.error === "object"
        ? data.error?.reason || JSON.stringify(data.error)
        : (data as { message?: string }).message || "Pinata error";
    return NextResponse.json(
      { error: msg || `Pinata HTTP ${res.status}` },
      { status: res.status >= 500 ? 502 : res.status }
    );
  }

  const hash = data.IpfsHash;
  if (!hash) {
    return NextResponse.json({ error: "No IpfsHash in response" }, { status: 502 });
  }

  const gateway =
    process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
  const gatewayUrl = `${gateway.replace(/\/$/, "")}/${hash}`;

  return NextResponse.json({
    IpfsHash: hash,
    gatewayUrl,
  });
}
