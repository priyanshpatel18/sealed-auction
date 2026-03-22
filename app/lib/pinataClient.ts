/** Browser → Next.js API → Pinata (JWT stays on server). */

export async function uploadFileToPinata(file: File): Promise<{
  ipfsHash: string;
  gatewayUrl: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/pinata/upload", {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    error?: string;
    IpfsHash?: string;
    gatewayUrl?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Image upload failed");
  }
  if (!data.IpfsHash || !data.gatewayUrl) {
    throw new Error("Unexpected Pinata response");
  }
  return { ipfsHash: data.IpfsHash, gatewayUrl: data.gatewayUrl };
}

export async function pinAuctionMetadata(payload: {
  title: string;
  description: string;
  imageUrl?: string | null;
  startingPriceSol?: string | null;
}): Promise<{ ipfsHash: string; gatewayUrl: string }> {
  const res = await fetch("/api/pinata/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    error?: string;
    IpfsHash?: string;
    gatewayUrl?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Metadata pin failed");
  }
  if (!data.IpfsHash || !data.gatewayUrl) {
    throw new Error("Unexpected Pinata response");
  }
  return { ipfsHash: data.IpfsHash, gatewayUrl: data.gatewayUrl };
}
