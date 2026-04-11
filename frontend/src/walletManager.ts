import { useEffect, useState } from "react";
import { NetworkId, WalletId, WalletManager } from "@txnlab/use-wallet";

export const manager = new WalletManager({
  network: NetworkId.TESTNET,
  wallets: [WalletId.PERA],
});

export function useWalletManager() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setVersion((v) => v + 1);
    });

    return () => unsubscribe();
  }, []);

  return {
    version,
    manager,
    activeAddress: manager.activeAddress,
  };
}
