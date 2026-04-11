import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import algosdk from "algosdk";
import { ABIContract } from "algosdk";

import { appConfig } from "../config";
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

export default function ProviderDashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    gpu_model: "RTX4090",
    vram_gb: 16,
    price_per_hour: 100,
    endpoint: "https://your-provider-domain.example",
  });
  const [sliderTokens, setSliderTokens] = useState(800);
  const [sliderPrice, setSliderPrice] = useState(100);

  const registryAppId = String(appConfig.registryAppId || 0);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await axios.get(`${INDEXER}/v2/applications/${registryAppId}/boxes`);
        const boxes = (res.data?.boxes || []) as Array<{ name: string }>;
        const providerInfoType = algosdk.ABIType.from("(uint64,byte[],uint64,byte[],uint64,uint64,uint64)");

        const parsed: Provider[] = [];
        for (const box of boxes) {
          const rawName = Uint8Array.from(atob(box.name), (c) => c.charCodeAt(0));
          const prefix = new TextEncoder().encode("provider");
          const isPrefixed = rawName.length > prefix.length && prefix.every((byte, idx) => rawName[idx] === byte);
          if (!isPrefixed) continue;
          const keyBytes = rawName.slice(prefix.length);
          if (keyBytes.length !== 32) continue;

          const address = algosdk.encodeAddress(keyBytes);
          const boxData = await axios.get(`${INDEXER}/v2/applications/${registryAppId}/box`, {
            params: { name: box.name },
          });
          const valueB64 = boxData.data?.value as string;
          if (!valueB64) continue;

          const value = Uint8Array.from(atob(valueB64), (c) => c.charCodeAt(0));
          const decoded = providerInfoType.decode(value) as [
            bigint,
            Uint8Array,
            bigint,
            Uint8Array,
            bigint,
            bigint,
            bigint,
          ];

          const active = Number(decoded[5]);
          if (active !== 1) continue;

          const endpoint = new TextDecoder().decode(decoded[3]).replace(/\0+$/g, "");
          parsed.push({
            address,
            gpu_model: new TextDecoder().decode(decoded[1]).replace(/\0+$/g, ""),
            vram_gb: Number(decoded[0]),
            price_per_hour: Number(decoded[2]),
            endpoint,
            uptime_score: Number(decoded[4]),
            verified: Number(decoded[6]) > 0,
          });
        }
        setProviders(parsed);
      } catch {
        setProviders([]);
      }
    };

    loadProviders();
  }, [registryAppId]);

  const activeCount = useMemo(() => providers.length, [providers]);
  const previewEstimate = useMemo(() => sliderTokens * sliderPrice, [sliderTokens, sliderPrice]);

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();

    const active = manager.activeAddress;
    if (!active) {
      alert("Connect wallet first.");
      return;
    }

    const signer = manager.transactionSigner;
    const algod = new algosdk.Algodv2("", ALGOD, "");
    const sp = await algod.getTransactionParams().do();
    const method = registryAbi.methods.find((m) => m.name === "register_provider");
    if (!method) {
      alert("Registry ABI not loaded.");
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

    await atc.execute(algod, 4);
    setShowModal(false);
  };

  return (
    <section className="card section-card">
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h2>Provider Network</h2>
          <p className="muted">{activeCount} active providers</p>
        </div>
        <button className="btn alt" onClick={() => setShowModal(true)}>
          Register My Hardware
        </button>
      </div>

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
            <button
              className="btn"
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

                const signer = manager.transactionSigner;
                const algod = new algosdk.Algodv2("", ALGOD, "");
                const sp = await algod.getTransactionParams().do();
                const method = registryAbi.methods.find((m) => m.name === "deregister_provider");
                if (!method) return;
                const atc = new algosdk.AtomicTransactionComposer();
                atc.addMethodCall({
                  appID: Number(registryAppId),
                  method,
                  sender: active,
                  suggestedParams: sp,
                  signer,
                  methodArgs: [],
                });
                await atc.execute(algod, 4);
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
            <button className="btn" type="submit">
              Submit
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
