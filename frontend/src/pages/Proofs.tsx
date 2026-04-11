import { useEffect, useState } from "react";
import axios from "axios";

import { bridgeUrl } from "../config";

type AppProof = {
  name: string;
  app_id: number;
  url: string;
};

type TxProof = {
  kind: string;
  label: string;
  tx_id: string;
  url: string;
  round?: number;
  timestamp?: string;
};

type ProofPayload = {
  network: string;
  indexer_url: string;
  apps: AppProof[];
  proofs: TxProof[];
};

export default function Proofs() {
  const [payload, setPayload] = useState<ProofPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProofs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(bridgeUrl("/agent/proofs"));
      setPayload(res.data as ProofPayload);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.message : "Failed to load proofs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProofs();
  }, []);

  return (
    <section className="card section-card">
      <div className="topbar" style={{ marginBottom: 14 }}>
        <div>
          <h2>On-Chain Proofs</h2>
          <p className="muted">Live proof artifacts from backend + indexer integration</p>
        </div>
        <button className="btn" onClick={() => void loadProofs()}>
          Refresh Proofs
        </button>
      </div>

      {loading && <p className="muted">Loading proofs...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && payload && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <p className="muted" style={{ margin: 0 }}>
              Network: <strong>{payload.network.toUpperCase()}</strong> | Indexer: {payload.indexer_url}
            </p>
          </div>

          <div className="grid" style={{ marginBottom: 14 }}>
            {payload.apps.map((app) => (
              <article className="card" key={app.name}>
                <h3>{app.name}</h3>
                <p className="muted">App ID: {app.app_id}</p>
                <a href={app.url} target="_blank" rel="noreferrer">
                  Open on Explorer
                </a>
              </article>
            ))}
          </div>

          <div className="grid">
            {payload.proofs.map((proof) => (
              <article className="card" key={`${proof.kind}-${proof.tx_id}`}>
                <h3>{proof.label}</h3>
                <p className="muted">{proof.tx_id}</p>
                {proof.round && <p className="muted">Round: {proof.round}</p>}
                {proof.timestamp && <p className="muted">At: {new Date(proof.timestamp).toLocaleString()}</p>}
                <a href={proof.url} target="_blank" rel="noreferrer">
                  View Transaction
                </a>
              </article>
            ))}
            {payload.proofs.length === 0 && <p className="muted">No proofs found yet. Trigger a job from Agent Activity.</p>}
          </div>
        </>
      )}
    </section>
  );
}
