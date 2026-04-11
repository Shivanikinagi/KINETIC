import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { bridgeUrl, txExplorerUrl } from "../config";

type LogEntry = {
  timestamp: string;
  message: string;
  task_type?: string;
};

type StatusPayload = {
  status: "running" | "idle" | "error";
  jobs_today: number;
  algo_spent_today: number;
  verifications_passed: number;
  budget_remaining: number;
  current_task?: { type?: string; tokens?: number };
};

function iconFor(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("payment")) return "💳";
  if (text.includes("verify") || text.includes("escrow_released")) return "✓";
  if (text.includes("error") || text.includes("fraud") || text.includes("failed")) return "!";
  return "-";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}

export default function AgentActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runTokens, setRunTokens] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<StatusPayload>({
    status: "idle",
    jobs_today: 0,
    algo_spent_today: 0,
    verifications_passed: 0,
    budget_remaining: 0,
    current_task: { type: "inference", tokens: 0 },
  });

  useEffect(() => {
    const tick = async () => {
      try {
        const [logRes, statusRes] = await Promise.all([
          axios.get(bridgeUrl("/agent/log")),
          axios.get(bridgeUrl("/agent/status")),
        ]);
        const nextLogs = (logRes.data as LogEntry[]).slice().reverse();
        setLogs(nextLogs);
        setStatus(statusRes.data as StatusPayload);
      } catch {
        setStatus((prev) => ({ ...prev, status: "error" }));
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const fraudAttempts = useMemo(
    () => logs.filter((entry) => entry.message.toLowerCase().includes("fraud_detected")).length,
    [logs],
  );

  const runTestJob = async () => {
    setIsRunning(true);
    try {
      await axios.post(bridgeUrl("/agent/run"), { type: "inference", tokens: runTokens, payload: "demo" });
    } catch (error) {
      const text =
        axios.isAxiosError(error)
          ? `Run failed: ${error.response?.status || "network"} ${error.response?.data?.detail || error.message}`
          : "Run failed";
      setLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          message: text,
          task_type: "inference",
        },
        ...prev,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="card section-card">
      <div className="topbar" style={{ marginBottom: 14 }}>
        <div>
          <h2>Agent Activity</h2>
          <p className="muted">Status: <strong>{status.status}</strong></p>
          <p className="muted">
            Task: {status.current_task?.type || "-"} | Tokens: {status.current_task?.tokens || 0} | Budget remaining: {status.budget_remaining.toFixed(3)} ALGO
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            min={1}
            max={5000}
            value={runTokens}
            onChange={(e) => setRunTokens(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: 110 }}
          />
          <button className="btn" onClick={runTestJob} disabled={isRunning}>
            {isRunning ? "Starting..." : "Run Test Job"}
          </button>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: 14 }}>
        <div className="metric">
          <div className="muted">Jobs completed today</div>
          <h3>{status.jobs_today}</h3>
        </div>
        <div className="metric">
          <div className="muted">Total ALGO spent today</div>
          <h3>{status.algo_spent_today.toFixed(3)}</h3>
        </div>
        <div className="metric">
          <div className="muted">Verifications passed</div>
          <h3>{status.verifications_passed}</h3>
        </div>
        <div className="metric">
          <div className="muted">Fraud attempts caught</div>
          <h3>{fraudAttempts}</h3>
        </div>
      </div>

      <div className="card scroll">
        {logs.map((entry, idx) => {
          const match = entry.message.match(/tx_id=([A-Z0-9]+)/i);
          const txId = match?.[1];
          return (
            <div key={`${entry.timestamp}-${idx}`} className="timeline-item">
              <span className="timeline-icon">{iconFor(entry.message)}</span>
              <div>
                <div className="muted" style={{ fontSize: "0.82rem" }}>{relativeTime(entry.timestamp)}</div>
                <div>{entry.message}</div>
                {txId && (
                  <a href={txExplorerUrl(txId)} target="_blank" rel="noreferrer">
                    {txId.slice(0, 6)}...{txId.slice(-6)}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
