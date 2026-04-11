import { WalletId } from "@txnlab/use-wallet";
import { useWalletManager } from "../walletManager";

function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function WalletConnect() {
  const { manager, activeAddress, isReady, initError } = useWalletManager();

  const connectWallet = async () => {
    try {
      const pera = manager.getWallet(WalletId.PERA);
      if (!pera) {
        alert("Pera wallet is not available in this browser. Install Pera Wallet extension.");
        return;
      }
      await pera.connect();
      pera.setActive();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Wallet connect failed");
    }
  };

  const disconnectWallet = async () => {
    await manager.disconnect();
  };

  if (!isReady) {
    return <button className="btn alt" disabled>Initializing wallet...</button>;
  }

  if (initError) {
    return <button className="btn alt" onClick={connectWallet}>Retry Wallet Connect</button>;
  }

  return (
    <button className="btn alt" onClick={activeAddress ? disconnectWallet : connectWallet}>
      {activeAddress ? shortAddress(activeAddress) : "Connect Wallet"}
    </button>
  );
}
