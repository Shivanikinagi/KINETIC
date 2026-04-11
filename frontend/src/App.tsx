import { useMemo, useState } from "react";
import WalletConnect from "./components/WalletConnect";
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
      <header className="topbar">
        <div>
          <h1>P2P Compute Marketplace</h1>
          <p className="muted">Algorand Agentic Commerce dashboard</p>
        </div>
        <WalletConnect />
      </header>

      <div className="tabs card">
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

      {content}
    </main>
  );
}
