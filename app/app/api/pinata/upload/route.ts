import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Pin image to IPFS via Pinata. Requires `PINATA_JWT` in server env (never expose to client).
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const out = new FormData();
  out.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: out,
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
