"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { anchorWalletFromAdapter } from "@/lib/anchorWallet";
import { computeCommitEndSec } from "@/lib/auctionTimes";
import { BASE_ENDPOINT } from "@/lib/config";
import { explorerClusterFromRpc } from "@/lib/explorer";
import {
  fetchOnchainAuctionSnapshot,
  type OnchainAuctionSnapshot,
} from "@/lib/onchainAuction";
import { rememberCreatedAuction } from "@/lib/onchainListingStorage";
import { programFor } from "@/lib/program";
import { pinAuctionMetadata, uploadFileToPinata } from "@/lib/pinataClient";
import { auctionPda, runtimePda, vaultPda } from "@/lib/pdas";
import { ensureWalletFunds } from "@/lib/solana";
import { friendlyTxError } from "@/lib/walletErrors";
import { OnchainAuctionPanel } from "@/components/onchain/OnchainAuctionPanel";
import { AuctionPreviewCard } from "@/components/create-auction/AuctionPreviewCard";
import { DateTimePicker } from "@/components/create-auction/DateTimePicker";
import { ImageUpload } from "@/components/create-auction/ImageUpload";
import { InfoCard } from "@/components/create-auction/InfoCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const CURRENCIES = [
  { value: "SOL", label: "SOL" },
  { value: "ETH", label: "ETH" },
  { value: "USDC", label: "USDC" },
];

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function randomAuctionIdStr(): string {
  return String(
    (Date.now() % 1_000_000_000) + Math.floor(Math.random() * 1_000_000)
  );
}

type BusyStep = "upload" | "metadata" | "chain" | null;

export default function CreateAuctionPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("");
  const [currency, setCurrency] = useState("SOL");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [auctionIdStr, setAuctionIdStr] = useState(() => randomAuctionIdStr());

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [busyStep, setBusyStep] = useState<BusyStep>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [metadataGatewayUrl, setMetadataGatewayUrl] = useState<string | null>(
    null
  );
  /** Set after image is pinned to Pinata (same URL embedded in metadata JSON). */
  const [pinataCoverGatewayUrl, setPinataCoverGatewayUrl] = useState<string | null>(
    null
  );
  /** Fetched from `metadataGatewayUrl` via `/api/metadata-proxy` after pin. */
  const [ipfsMetadataPreview, setIpfsMetadataPreview] = useState<{
    title?: string;
    name?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [onchainSnapshot, setOnchainSnapshot] =
    useState<OnchainAuctionSnapshot | null>(null);
  const [onchainLoading, setOnchainLoading] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);

  const explorerCluster = useMemo(
    () =>
      explorerClusterFromRpc(connection.rpcEndpoint || BASE_ENDPOINT),
    [connection.rpcEndpoint]
  );

  const auctionIdBn = useMemo(() => {
    try {
      return new BN(auctionIdStr.replace(/\D/g, "") || "0", 10);
    } catch {
      return new BN(0);
    }
  }, [auctionIdStr]);

  const program = useMemo(() => {
    const w = anchorWalletFromAdapter(wallet);
    if (!w) return null;
    return programFor(connection, w);
  }, [connection, wallet, connected, publicKey]);

  useEffect(() => {
    if (!metadataGatewayUrl?.trim()) {
      setIpfsMetadataPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/metadata-proxy?url=${encodeURIComponent(metadataGatewayUrl)}`
        );
        if (!r.ok || cancelled) return;
        const j = (await r.json()) as {
          title?: string;
          name?: string;
          description?: string;
          image?: string;
        };
        if (!cancelled) setIpfsMetadataPreview(j);
      } catch {
        if (!cancelled) setIpfsMetadataPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [metadataGatewayUrl]);

  useEffect(() => {
    if (!txSignature) {
      setOnchainSnapshot(null);
      setOnchainError(null);
      setOnchainLoading(false);
      return;
    }
    let cancelled = false;
    setOnchainLoading(true);
    setOnchainError(null);
    (async () => {
      try {
        const snap = await fetchOnchainAuctionSnapshot(connection, auctionIdBn);
        if (!cancelled) {
          setOnchainSnapshot(snap);
          if (!snap) {
            setOnchainError(
              "Could not read the auction account yet — refresh or open the live view."
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setOnchainError(
            e instanceof Error ? e.message : "Failed to load on-chain data."
          );
        }
      } finally {
        if (!cancelled) setOnchainLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [txSignature, connection, auctionIdBn]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const dateErrors = useMemo(() => {
    if (!startDatetime || !endDatetime) return { start: "", end: "", order: "" };
    const s = new Date(startDatetime);
    const e = new Date(endDatetime);
    if (Number.isNaN(s.getTime())) return { start: "Invalid date", end: "", order: "" };
    if (Number.isNaN(e.getTime())) return { start: "", end: "Invalid date", order: "" };
    if (e <= s) {
      return {
        start: "",
        end: "",
        order: "End must be after start.",
      };
    }
    return { start: "", end: "", order: "" };
  }, [startDatetime, endDatetime]);

  const priceError = useMemo(() => {
    if (!startingPrice.trim()) return submitAttempted ? "Required" : "";
    const n = Number(startingPrice);
    if (Number.isNaN(n) || n <= 0) return "Enter a positive number";
    return "";
  }, [startingPrice, submitAttempted]);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !description.trim()) return false;
    const n = Number(startingPrice);
    if (Number.isNaN(n) || n <= 0) return false;
    if (!startDatetime || !endDatetime) return false;
    const s = new Date(startDatetime);
    const e = new Date(endDatetime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    if (e <= s) return false;
    if (auctionIdBn.lte(new BN(0))) return false;
    return true;
  }, [
    title,
    description,
    startingPrice,
    startDatetime,
    endDatetime,
    auctionIdBn,
  ]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitAttempted(true);
      setFormError(null);
      setTxSignature(null);
      setMetadataGatewayUrl(null);
      setPinataCoverGatewayUrl(null);
      setIpfsMetadataPreview(null);

      if (!canSubmit) return;
      if (!connected || !publicKey) {
        setFormError("Connect your Solana wallet (header) first.");
        return;
      }
      if (!program) {
        setFormError("Wallet not ready — try reconnecting.");
        return;
      }

      const startSec = Math.floor(new Date(startDatetime).getTime() / 1000);
      const endSec = Math.floor(new Date(endDatetime).getTime() / 1000);
      const sched = computeCommitEndSec(startSec, endSec);
      if (!sched.ok) {
        setFormError(sched.error);
        return;
      }
      const commitEndSec = sched.commitEndSec;

      try {
        setBusyStep("upload");
        let coverImageUrl: string | null = null;
        if (imageFile) {
          const { gatewayUrl } = await uploadFileToPinata(imageFile);
          coverImageUrl = gatewayUrl;
          setPinataCoverGatewayUrl(gatewayUrl);
        } else {
          setPinataCoverGatewayUrl(null);
        }

        setBusyStep("metadata");
        const { gatewayUrl: metaUrl } = await pinAuctionMetadata({
          title: title.trim(),
          description: description.trim(),
          imageUrl: coverImageUrl,
        });
        setMetadataGatewayUrl(metaUrl);

        setBusyStep("chain");
        await ensureWalletFunds(connection, publicKey);

        const auction = auctionPda(auctionIdBn);
        const runtime = runtimePda(auctionIdBn);
        const vault = vaultPda(auctionIdBn);

        const sig = await program.methods
          .initializeAuction(
            auctionIdBn,
            new BN(startSec),
            new BN(commitEndSec),
            new BN(endSec),
            false,
            metaUrl
          )
          .accounts({
            seller: publicKey,
            auction,
            runtime,
            vault,
            systemProgram: SystemProgram.programId,
          } as never)
          .rpc();

        setTxSignature(sig);
        rememberCreatedAuction(auctionIdStr, sig);
      } catch (err) {
        console.error(err);
        setFormError(await friendlyTxError(err, connection));
      } finally {
        setBusyStep(null);
      }
    },
    [
      canSubmit,
      connected,
      publicKey,
      program,
      startDatetime,
      endDatetime,
      imageFile,
      title,
      description,
      connection,
      auctionIdBn,
    ]
  );

  const fillMock = useCallback(() => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 5);
    const end = new Date(start);
    end.setHours(end.getHours() + 24);
    setTitle("Genesis sealed lot #1");
    setDescription(
      "Sample listing — bids stay hidden until the window closes."
    );
    setStartingPrice("1.5");
    setMinIncrement("0.1");
    setCurrency("SOL");
    setStartDatetime(toLocalDatetimeValue(start));
    setEndDatetime(toLocalDatetimeValue(end));
    setAuctionIdStr(randomAuctionIdStr());
  }, []);

  const busyLabel =
    busyStep === "upload"
      ? "Uploading to IPFS…"
      : busyStep === "metadata"
        ? "Pinning metadata…"
        : busyStep === "chain"
          ? "Sign in wallet…"
          : null;

  return (
    <div className="relative z-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(222,241,87,0.09),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime">
              Create
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl">
              Create Auction
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-brand-muted">
              Launch a sealed-bid auction where all bids stay private until the
              end.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fillMock}
              className="text-sm font-medium text-brand-muted underline-offset-4 transition hover:text-brand-lime hover:underline"
            >
              Fill sample fields
            </button>
            <Link
              href="/discover"
              className="text-sm font-medium text-brand-muted transition hover:text-brand-cream"
            >
              ← Discover
            </Link>
          </div>
        </div>

        {!connected ? (
          <div
            className="mb-8 rounded-2xl border border-brand-muted/50 bg-brand-cream/5 px-5 py-4 text-sm text-brand-cream"
            role="status"
          >
            <p className="font-medium text-brand-lime">Wallet required</p>
            <p className="mt-1 text-brand-muted">
              Connect a wallet in the header to upload to Pinata and sign{" "}
              <code className="text-xs text-brand-cream/90">initialize_auction</code>
              .
            </p>
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
          <form onSubmit={onSubmit} className="space-y-10" noValidate>
            {txSignature ? (
              <div className="space-y-6" role="status">
                <div className="rounded-2xl border border-brand-lime/35 bg-brand-lime/10 px-5 py-4 text-sm text-brand-cream">
                  <p className="font-semibold text-brand-lime">
                    Auction created on-chain
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-brand-muted">
                    Tx: {txSignature}
                  </p>
                  {metadataGatewayUrl ? (
                    <p className="mt-2 break-all text-xs text-brand-muted">
                      Metadata JSON (IPFS):{" "}
                      <a
                        href={metadataGatewayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-lime underline"
                      >
                        {metadataGatewayUrl}
                      </a>
                    </p>
                  ) : null}
                  {(ipfsMetadataPreview?.image || pinataCoverGatewayUrl) ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-brand-muted/40 bg-brand-bg/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ipfsMetadataPreview?.image || pinataCoverGatewayUrl || ""}
                        alt=""
                        className="max-h-56 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                  {ipfsMetadataPreview ? (
                    <div className="mt-4 rounded-xl border border-brand-muted/35 bg-brand-bg/40 px-4 py-3 text-sm">
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted">
                        Fetched from IPFS metadata
                      </p>
                      <p className="mt-2 font-medium text-brand-cream">
                        {ipfsMetadataPreview.title ||
                          ipfsMetadataPreview.name ||
                          "—"}
                      </p>
                      {ipfsMetadataPreview.description ? (
                        <p className="mt-2 text-xs leading-relaxed text-brand-muted">
                          {ipfsMetadataPreview.description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-brand-muted">
                    On-chain data stores the schedule and native SOL escrow; the
                    metadata URI points at this IPFS JSON (title, description, image).
                  </p>
                  <p className="mt-4 flex flex-wrap gap-4 text-sm">
                    <Link
                      href={`/auction/live/${auctionIdStr}`}
                      className="font-medium text-brand-lime underline"
                    >
                      Open live on-chain view
                    </Link>
                    <Link
                      href="/discover"
                      className="font-medium text-brand-muted underline hover:text-brand-cream"
                    >
                      Discover
                    </Link>
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-brand-lime underline"
                    onClick={() => {
                      setTxSignature(null);
                      setMetadataGatewayUrl(null);
                      setPinataCoverGatewayUrl(null);
                      setIpfsMetadataPreview(null);
                      setAuctionIdStr(randomAuctionIdStr());
                    }}
                  >
                    Create another
                  </button>
                </div>

                {onchainLoading ? (
                  <p className="text-sm text-brand-muted">Loading on-chain accounts…</p>
                ) : null}
                {onchainError ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-100/95">
                    {onchainError}
                  </p>
                ) : null}
                {onchainSnapshot ? (
                  <OnchainAuctionPanel
                    snapshot={onchainSnapshot}
                    cluster={explorerCluster}
                    txSignature={txSignature}
                  />
                ) : null}
              </div>
            ) : null}

            <section className="glass-card feature-card rounded-2xl border border-brand-muted/40 p-6 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">
                On-chain
              </h2>
              <p className="mt-2 text-xs text-brand-muted leading-relaxed">
                Same cluster as{" "}
                <code className="text-brand-cream/80">NEXT_PUBLIC_BASE_RPC</code> —
                program must be deployed there. Bids settle in native SOL (lamports).
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <Input
                  id="auction-id"
                  label="Auction ID (u64)"
                  inputMode="numeric"
                  value={auctionIdStr}
                  onChange={(e) =>
                    setAuctionIdStr(e.target.value.replace(/\D/g, "") || "0")
                  }
                  hint="Must be unique per seller for this program."
                />
              </div>
              <button
                type="button"
                className="mt-4 text-xs font-medium text-brand-lime hover:underline"
                onClick={() => setAuctionIdStr(randomAuctionIdStr())}
              >
                Randomize ID
              </button>
            </section>

            <section className="glass-card feature-card rounded-2xl border border-brand-muted/40 p-6 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">
                Basic info
              </h2>
              <div className="mt-6 space-y-6">
                <ImageUpload previewUrl={previewUrl} onFile={setImageFile} />
                <Input
                  id="auction-title"
                  label="Title"
                  placeholder="e.g. Rare genesis pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  error={
                    submitAttempted && !title.trim() ? "Required" : undefined
                  }
                />
                <Textarea
                  id="auction-desc"
                  label="Description"
                  placeholder="What are you auctioning? Keep it clear for bidders."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  error={
                    submitAttempted && !description.trim()
                      ? "Required"
                      : undefined
                  }
                />
              </div>
            </section>

            <section className="glass-card feature-card rounded-2xl border border-brand-muted/40 p-6 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">
                Pricing (display)
              </h2>
              <p className="mt-2 text-xs text-brand-muted">
                Shown in your IPFS metadata — not enforced on-chain by this program.
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <Input
                  id="starting-price"
                  label="Starting price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  error={priceError}
                  hint="Included in metadata JSON."
                />
                <Input
                  id="min-increment"
                  label="Minimum bid increment"
                  type="text"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  hint="Optional in metadata."
                />
                <div className="sm:col-span-2">
                  <Select
                    id="currency"
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={CURRENCIES}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card feature-card rounded-2xl border border-brand-muted/40 p-6 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">
                Timing
              </h2>
              <p className="mt-2 text-xs text-brand-muted">
                Bidding opens at <strong className="text-brand-cream/90">start</strong>
                , commits close at the midpoint, reveal ends at{" "}
                <strong className="text-brand-cream/90">end</strong> (program
                constraints).
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <DateTimePicker
                  id="start-dt"
                  label="Start (bidding opens)"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  error={
                    submitAttempted && !startDatetime
                      ? "Required"
                      : dateErrors.start
                  }
                />
                <DateTimePicker
                  id="end-dt"
                  label="End (reveal deadline)"
                  value={endDatetime}
                  onChange={(e) => setEndDatetime(e.target.value)}
                  error={
                    submitAttempted && !endDatetime
                      ? "Required"
                      : dateErrors.end
                  }
                />
              </div>
              {dateErrors.order ? (
                <p className="mt-3 text-sm text-red-300/90">{dateErrors.order}</p>
              ) : null}
            </section>

            <InfoCard>
              <p className="font-medium text-brand-cream">
                IPFS + on-chain
              </p>
              <p className="mt-2 text-brand-muted">
                Cover image and listing text are pinned to Pinata (IPFS). Your wallet
                then signs <code className="text-brand-cream/90">initialize_auction</code>{" "}
                for the auction id, vault (native SOL), and schedule — no SPL mint.
              </p>
            </InfoCard>

            {formError ? (
              <p className="whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 font-mono text-xs leading-relaxed text-red-100/95">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-brand-muted">
                {busyLabel
                  ? busyLabel
                  : canSubmit && connected
                    ? "Ready — uploads first, then wallet signature."
                    : "Fill fields and connect wallet."}
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={!!txSignature || busyStep !== null}
                className="min-w-[200px] shadow-[0_0_32px_-8px_rgba(222,241,87,0.45)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {busyStep ? busyLabel : "Create Auction"}
              </Button>
            </div>
          </form>

          <aside className="lg:sticky lg:top-[calc(var(--site-header-height)+1.5rem)] lg:self-start">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Live preview
            </p>
            <AuctionPreviewCard
              imageUrl={pinataCoverGatewayUrl ?? previewUrl}
              title={title}
              description={description}
              startingPrice={startingPrice}
              currency={currency}
              startLocal={startDatetime || null}
              endLocal={endDatetime || null}
            />
            <p className="mt-4 text-center text-xs text-brand-muted/80 lg:text-left">
              Preview updates as you edit. Times drive on-chain schedule.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
