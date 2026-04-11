import { WalletId } from "@txnlab/use-wallet";
import { useWalletManager } from "../walletManager";

function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export default function WalletConnect() {
  const { manager, activeAddress } = useWalletManager();

  const connectWallet = async () => {
    const pera = manager.getWallet(WalletId.PERA);
    if (!pera) return;
    await pera.connect();
    pera.setActive();
  };

  const disconnectWallet = async () => {
    await manager.disconnect();
  };

  return (
    <button className="btn" onClick={activeAddress ? disconnectWallet : connectWallet}>
      {activeAddress ? shortAddress(activeAddress) : "Connect Wallet"}
    </button>
  );
}
