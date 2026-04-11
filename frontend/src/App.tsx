import { useMemo, useState } from "react";
import WalletConnect from "./components/WalletConnect";
import { appConfig, isChainConfigured } from "./config";
import AgentActivityFeed from "./pages/AgentActivityFeed";
import ProviderDashboard from "./pages/ProviderDashboard";
import TransactionLog from "./pages/TransactionLog";

type TabKey = "providers" | "activity" | "transactions";

export default function App() {
  const [tab, setTab] = useState<TabKey>("providers");

  const content = useMemo(() => {
    if (tab === "providers") return <ProviderDashboard />;
    if (tab === "activity") return <AgentActivityFeed />;
    return <TransactionLog />;
  }, [tab]);

  return (
    <main className="app-shell">
      <header className="hero-wrap reveal-fade">
        <div>
          <div className="chip">Algorand Agentic Commerce</div>
          <h1 className="hero-title">P2P Compute Marketplace</h1>
          <p className="hero-subtitle">
            Autonomous agents discover providers, pay through x402 flow, and verify outcomes without manual wallet approvals.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-label">Protocol</span>
              <span className="hero-stat-value">HTTP 402</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Settlement</span>
              <span className="hero-stat-value">Algorand</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Mode</span>
              <span className="hero-stat-value">Agent-to-Agent</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Network</span>
              <span className="hero-stat-value">{appConfig.network.toUpperCase()}</span>
            </div>
          </div>
          {!isChainConfigured() && (
            <p className="muted" style={{ marginTop: 10 }}>
              Add `VITE_REGISTRY_APP_ID` and `VITE_ESCROW_APP_ID` in `frontend/.env` to enable full on-chain proof views.
            </p>
          )}
        </div>
        <div className="hero-side">
          <WalletConnect />
          <div className="pulse-orb" aria-hidden="true" />
        </div>
      </header>

      <div className="tabs card reveal-up">
        <button className={`tab-btn ${tab === "providers" ? "active" : ""}`} onClick={() => setTab("providers")}>
          Provider Network
        </button>
        <button className={`tab-btn ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
          Agent Activity
        </button>
        <button className={`tab-btn ${tab === "transactions" ? "active" : ""}`} onClick={() => setTab("transactions")}>
          Transaction Log
        </button>
      </div>

      <section className="reveal-up-delay">{content}</section>
    </main>
  );
}
