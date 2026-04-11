import { useState } from "react";
import { WalletId } from "@txnlab/use-wallet";
import { appConfig } from "../config";
import { useWalletManager } from "../walletManager";

function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function WalletConnect() {
  const { manager, activeAddress, isReady, initError } = useWalletManager();
  const [walletError, setWalletError] = useState("");

  const expectedNetwork = appConfig.network.toUpperCase();

  const toUserMessage = (error: unknown): string => {
    const raw = error instanceof Error ? error.message : String(error ?? "Wallet connect failed");
    const text = raw.toLowerCase();
    if (text.includes("network mismatch") || text.includes("4100")) {
      return `Pera is on a different network. Switch Pera Wallet to ${expectedNetwork} and try again.`;
    }
    return raw;
  };

  const connectWallet = async () => {
    try {
      setWalletError("");
      const pera = manager.getWallet(WalletId.PERA);
      if (!pera) {
        setWalletError("Pera wallet is not available in this browser. Install Pera Wallet extension.");
        return;
      }
      await pera.connect();
      await pera.setActive();
    } catch (error: unknown) {
      setWalletError(toUserMessage(error));
    }
  };

  const disconnectWallet = async () => {
    try {
      setWalletError("");
      await manager.disconnect();
    } catch (error: unknown) {
      setWalletError(toUserMessage(error));
    }
  };

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      {!isReady ? (
        <button className="btn alt" disabled>Initializing wallet...</button>
      ) : initError ? (
        <button className="btn alt" onClick={connectWallet}>Retry Wallet Connect</button>
      ) : (
        <button className="btn alt" onClick={activeAddress ? disconnectWallet : connectWallet}>
          {activeAddress ? shortAddress(activeAddress) : "Connect Wallet"}
        </button>
      )}
      {(walletError || initError) && <div className="error-text">{walletError || initError}</div>}
      {!activeAddress && <div className="muted">Wallet network: {expectedNetwork}</div>}
    </div>
  );
}
