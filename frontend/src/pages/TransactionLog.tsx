import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type Txn = {
  id: string;
  sender?: string;
  payment_transaction?: { amount?: number; receiver?: string };
  confirmed_round?: number;
  round_time?: number;
};

const INDEXER = "https://testnet-idx.algonode.cloud";

export default function TransactionLog() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [page, setPage] = useState(1);
  const escrowAppId = import.meta.env.VITE_ESCROW_APP_ID || "0";

  useEffect(() => {
    const loadTxns = async () => {
      try {
        const res = await axios.get(`${INDEXER}/v2/transactions`, { params: { "application-id": escrowAppId } });
        const txns = (res.data?.transactions || []) as Txn[];
        txns.sort((a, b) => (b.confirmed_round || 0) - (a.confirmed_round || 0));
        setRows(txns);
      } catch {
        setRows([]);
      }
    };

    void loadTxns();
  }, [escrowAppId]);

  const paged = useMemo(() => {
    const start = (page - 1) * 20;
    return rows.slice(start, start + 20);
  }, [rows, page]);

  const totalPages = Math.max(1, Math.ceil(rows.length / 20));

  return (
    <section className="card">
      <h2 style={{ marginBottom: 12 }}>Transaction Log</h2>
      <table>
        <thead>
          <tr>
            <th>Tx ID</th>
            <th>Type</th>
            <th>Amount (ALGO)</th>
            <th>From</th>
            <th>To</th>
            <th>Round</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((tx) => {
            const amount = (tx.payment_transaction?.amount || 0) / 1_000_000;
            const to = tx.payment_transaction?.receiver || "-";
            return (
              <tr key={tx.id}>
                <td>
                  <a href={`https://testnet.explorer.perawallet.app/tx/${tx.id}`} target="_blank" rel="noreferrer">
                    {tx.id.slice(0, 10)}...
                  </a>
                </td>
                <td>escrow</td>
                <td>{amount.toFixed(4)}</td>
                <td>{(tx.sender || "-").slice(0, 8)}...</td>
                <td>{to.slice(0, 8)}...</td>
                <td>{tx.confirmed_round || "-"}</td>
                <td>{tx.round_time ? new Date(tx.round_time * 1000).toLocaleTimeString() : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <div className="muted">
          Page {page} / {totalPages}
        </div>
        <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          Next
        </button>
      </div>
    </section>
  );
}
