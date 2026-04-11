import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import algosdk from "algosdk";
import { ABIContract } from "algosdk";

import { appConfig, txExplorerUrl } from "../config";
import { manager } from "../walletManager";

type Provider = {
  address: string;
  gpu_model: string;
  vram_gb: number;
  price_per_hour: number;
  endpoint: string;
  uptime_score: number;
  verified: boolean;
};

const INDEXER = appConfig.indexerUrl;
const ALGOD = appConfig.algodUrl;
const MIN_TX_BUFFER_MICROALGO = 5_000;
const TESTNET_FAUCET_URL = "https://bank.testnet.algorand.network/";
const REGISTER_SELECTOR_HEX = "71c4983d";
const DEREGISTER_SELECTOR_HEX = "6decaf3d";

const registryAbi = new ABIContract({
  name: "ProviderRegistry",
  methods: [
    {
      name: "register_provider",
      args: [
        { type: "uint64", name: "vram_gb" },
        { type: "byte[]", name: "gpu_model" },
        { type: "uint64", name: "price_per_hour" },
        { type: "byte[]", name: "endpoint_url" },
      ],
      returns: { type: "void" },
    },
    {
      name: "deregister_provider",
      args: [],
      returns: { type: "void" },
    },
    {
      name: "get_provider",
      args: [{ type: "address", name: "provider" }],
      returns: { type: "(uint64,byte[],uint64,byte[],uint64,uint64,uint64)" },
    },
  ],
} as never);

function uptimeColor(score: number): string {
  if (score > 80) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function parseChainError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown transaction error");
  const text = message.toLowerCase();
  if (text.includes("overspend") || text.includes("insufficient")) {
    if (appConfig.network === "testnet") {
      return `Insufficient TestNet ALGO balance. Fund your connected wallet from ${TESTNET_FAUCET_URL} and retry.`;
    }
    return "Insufficient ALGO balance in the connected wallet. Fund the wallet and retry.";
  }
  if (text.includes("network mismatch") || text.includes("4100")) {
    return `Wallet network mismatch. Switch wallet to ${appConfig.network.toUpperCase()} and retry.`;
  }
  return message;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function decodeUint64Arg(base64Arg: string): number {
  const bytes = Uint8Array.from(atob(base64Arg), (char) => char.charCodeAt(0));
  if (bytes.length !== 8) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const value = view.getBigUint64(0, false);
  return Number(value);
}

function decodeDynamicBytesArg(base64Arg: string): string {
  const bytes = Uint8Array.from(atob(base64Arg), (char) => char.charCodeAt(0));
  if (bytes.length < 2) return "";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint16(0, false);
  const payload = bytes.slice(2, 2 + size);
  return new TextDecoder().decode(payload).replace(/\0+$/g, "");
}

export default function ProviderDashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionTxId, setActionTxId] = useState("");
  const [form, setForm] = useState({
    gpu_model: "RTX4090",
    vram_gb: 16,
    price_per_hour: 100,
    endpoint: appConfig.providerApiUrl || "http://localhost:8000",
  });
  const [sliderTokens, setSliderTokens] = useState(800);
  const [sliderPrice, setSliderPrice] = useState(100);

  const registryAppId = String(appConfig.registryAppId || 0);

  const loadProviders = useCallback(async () => {
      try {
        const res = await axios.get(`${INDEXER}/v2/transactions`, {
          params: {
            "application-id": registryAppId,
            limit: 1000,
            "tx-type": "appl",
          },
        });

        type IndexerTxn = {
          sender?: string;
          "confirmed-round"?: number;
          "round-time"?: number;
          "application-transaction"?: {
            "application-args"?: string[];
          };
        };

        const txs = ((res.data?.transactions || []) as IndexerTxn[])
          .slice()
          .sort((a, b) => (a["confirmed-round"] || 0) - (b["confirmed-round"] || 0));

        const providerByAddress = new Map<string, Provider & { active: boolean }>();

        for (const tx of txs) {
          const sender = tx.sender;
          const args = tx["application-transaction"]?.["application-args"] || [];
          if (!sender || args.length === 0) continue;

          const selector = bytesToHex(Uint8Array.from(atob(args[0]), (char) => char.charCodeAt(0)));

          if (selector === REGISTER_SELECTOR_HEX && args.length >= 5) {
            providerByAddress.set(sender, {
              address: sender,
              vram_gb: decodeUint64Arg(args[1]),
              gpu_model: decodeDynamicBytesArg(args[2]),
              price_per_hour: decodeUint64Arg(args[3]),
              endpoint: decodeDynamicBytesArg(args[4]),
              uptime_score: 100,
              verified: true,
              active: true,
            });
          }

          if (selector === DEREGISTER_SELECTOR_HEX) {
            const existing = providerByAddress.get(sender);
            if (existing) {
              providerByAddress.set(sender, { ...existing, active: false });
            }
          }
        }

        const parsed = Array.from(providerByAddress.values()).filter((provider) => provider.active);
        setProviders(parsed);
      } catch {
        setProviders([]);
      }
  }, [registryAppId]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const activeCount = useMemo(() => providers.length, [providers]);
  const previewEstimate = useMemo(() => sliderTokens * sliderPrice, [sliderTokens, sliderPrice]);

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();

    const active = manager.activeAddress;
    if (!active) {
      alert("Connect wallet first.");
      return;
    }
    if (Number(registryAppId) <= 0) {
      alert("Registry app ID is missing. Set VITE_REGISTRY_APP_ID in frontend/.env.");
      return;
    }

    setActionTxId("");
    setActionMessage("");
    setIsSubmitting(true);
    try {
      const signer = manager.transactionSigner;
      const algod = new algosdk.Algodv2("", ALGOD, "");
      const accountInfo = await algod.accountInformation(active).do();
      const microAlgos = Number(accountInfo?.amount ?? 0);
      if (!Number.isFinite(microAlgos) || microAlgos < MIN_TX_BUFFER_MICROALGO) {
        if (appConfig.network === "testnet") {
          setActionMessage(`Connected wallet has ${microAlgos / 1_000_000} ALGO. Fund it at ${TESTNET_FAUCET_URL} and retry.`);
        } else {
          setActionMessage("Connected wallet has insufficient ALGO for transaction fees.");
        }
        return;
      }

      const sp = await algod.getTransactionParams().do();
      const method = registryAbi.methods.find((m) => m.name === "register_provider");
      if (!method) {
        setActionMessage("Registry ABI not loaded.");
        return;
      }

      const atc = new algosdk.AtomicTransactionComposer();
      atc.addMethodCall({
        appID: Number(registryAppId),
        method,
        sender: active,
        suggestedParams: sp,
        signer,
        methodArgs: [
          BigInt(form.vram_gb),
          new TextEncoder().encode(form.gpu_model),
          BigInt(form.price_per_hour),
          new TextEncoder().encode(form.endpoint),
        ],
      });

      const result = await atc.execute(algod, 4);
      const txId = result.txIDs?.[0] || "";
      setActionTxId(txId);
      setActionMessage("Provider registration submitted on-chain.");
      setShowModal(false);
      await loadProviders();
    } catch (error: unknown) {
      setActionMessage(parseChainError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card section-card">
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h2>Provider Network</h2>
          <p className="muted">{activeCount} active providers</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => void loadProviders()}>
            Refresh
          </button>
          <button
            className="btn"
            onClick={async () => {
              try {
                const base = appConfig.providerApiUrl;
                if (!base) {
                  setActionMessage("Provider API URL missing. Set VITE_PROVIDER_API_URL.");
                  return;
                }
                await axios.get(`${base}/health`);
                setActionMessage("Provider API is reachable.");
              } catch {
                setActionMessage("Provider API health check failed.");
              }
            }}
          >
            Check Provider API
          </button>
          <button className="btn alt" onClick={() => setShowModal(true)}>
            Register My Hardware
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ margin: 0 }}>{actionMessage}</p>
          {actionTxId && (
            <a href={txExplorerUrl(actionTxId)} target="_blank" rel="noreferrer">
              View tx {actionTxId.slice(0, 8)}...{actionTxId.slice(-8)}
            </a>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 6 }}>Price Sandbox</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Tune token demand and per-token rate to preview what your provider pricing feels like in agentic flows.
        </p>
        <div className="grid">
          <label>
            Tokens per job: <strong>{sliderTokens}</strong>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={sliderTokens}
              onChange={(e) => setSliderTokens(Number(e.target.value))}
            />
          </label>
          <label>
            microALGO per token: <strong>{sliderPrice}</strong>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={sliderPrice}
              onChange={(e) => setSliderPrice(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="chip" style={{ marginTop: 12 }}>
          Est. payment challenge: {(previewEstimate / 1_000_000).toFixed(4)} ALGO
        </div>
      </div>

      <div className="grid">
        {providers.map((provider) => (
          <article className="card provider-card" key={provider.address}>
            <h3>{provider.gpu_model}</h3>
            <p className="muted">VRAM {provider.vram_gb} GB</p>
            <p>{(provider.price_per_hour / 1_000_000).toFixed(4)} ALGO/hr</p>
            <p className="muted">{provider.endpoint}</p>
            <p>{provider.verified ? "Verified Member" : "Unverified"}</p>
            {manager.activeAddress && manager.activeAddress !== provider.address && (
              <p className="muted">Owned by another wallet</p>
            )}
            <button
              className="btn"
              disabled={Boolean(manager.activeAddress) && manager.activeAddress !== provider.address}
              onClick={async () => {
                const active = manager.activeAddress;
                if (!active) {
                  alert("Connect wallet first.");
                  return;
                }
                if (active !== provider.address) {
                  alert("You can only deregister your own provider entry.");
                  return;
                }

                setActionTxId("");
                setActionMessage("");
                try {
                  const signer = manager.transactionSigner;
                  const algod = new algosdk.Algodv2("", ALGOD, "");
                  const accountInfo = await algod.accountInformation(active).do();
                  const microAlgos = Number(accountInfo?.amount ?? 0);
                  if (!Number.isFinite(microAlgos) || microAlgos < MIN_TX_BUFFER_MICROALGO) {
                    if (appConfig.network === "testnet") {
                      setActionMessage(`Connected wallet has ${microAlgos / 1_000_000} ALGO. Fund it at ${TESTNET_FAUCET_URL} and retry.`);
                    } else {
                      setActionMessage("Connected wallet has insufficient ALGO for transaction fees.");
                    }
                    return;
                  }

                  const sp = await algod.getTransactionParams().do();
                  const method = registryAbi.methods.find((m) => m.name === "deregister_provider");
                  if (!method) {
                    setActionMessage("Registry ABI not loaded.");
                    return;
                  }

                  const atc = new algosdk.AtomicTransactionComposer();
                  atc.addMethodCall({
                    appID: Number(registryAppId),
                    method,
                    sender: active,
                    suggestedParams: sp,
                    signer,
                    methodArgs: [],
                  });
                  const result = await atc.execute(algod, 4);
                  const txId = result.txIDs?.[0] || "";
                  setActionTxId(txId);
                  setActionMessage("Provider deregistration submitted on-chain.");
                  await loadProviders();
                } catch (error: unknown) {
                  setActionMessage(parseChainError(error));
                }
              }}
              style={{ marginTop: 10 }}
            >
              Deregister
            </button>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>Uptime {provider.uptime_score}%</div>
              <div style={{ background: "rgba(17, 36, 58, 0.12)", borderRadius: 999, height: 8 }}>
                <div
                  style={{
                    width: `${provider.uptime_score}%`,
                    height: 8,
                    borderRadius: 999,
                    background: uptimeColor(provider.uptime_score),
                  }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      {showModal && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Register Hardware</h3>
          <form onSubmit={submitRegistration} className="grid" style={{ marginTop: 12 }}>
            <label>
              GPU Model
              <input value={form.gpu_model} onChange={(e) => setForm((v) => ({ ...v, gpu_model: e.target.value }))} />
            </label>
            <label>
              VRAM (GB)
              <input
                type="number"
                value={form.vram_gb}
                onChange={(e) => setForm((v) => ({ ...v, vram_gb: Number(e.target.value) }))}
              />
              <input
                type="range"
                min={2}
                max={64}
                step={1}
                value={form.vram_gb}
                onChange={(e) => setForm((v) => ({ ...v, vram_gb: Number(e.target.value) }))}
              />
            </label>
            <label>
              Price per Hour (microALGO)
              <input
                type="number"
                value={form.price_per_hour}
                onChange={(e) => setForm((v) => ({ ...v, price_per_hour: Number(e.target.value) }))}
              />
              <input
                type="range"
                min={10}
                max={5000}
                step={10}
                value={form.price_per_hour}
                onChange={(e) => setForm((v) => ({ ...v, price_per_hour: Number(e.target.value) }))}
              />
            </label>
            <label>
              Endpoint URL
              <input value={form.endpoint} onChange={(e) => setForm((v) => ({ ...v, endpoint: e.target.value }))} />
            </label>
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
