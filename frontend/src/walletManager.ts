import { useEffect, useState } from "react";
import { WalletId, WalletManager } from "@txnlab/use-wallet";

import { appConfig } from "./config";

export const manager = new WalletManager({
  network: appConfig.walletNetwork,
  wallets: [WalletId.PERA],
});

export function useWalletManager() {
  const [version, setVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string>("");

  useEffect(() => {
    void manager
      .resumeSessions()
      .then(() => setIsReady(true))
      .catch((error: unknown) => {
        setInitError(error instanceof Error ? error.message : "Wallet session initialization failed");
      });

    const unsubscribe = manager.subscribe(() => {
      setVersion((v) => v + 1);
    });

    return () => unsubscribe();
  }, []);

  return {
    version,
    manager,
    activeAddress: manager.activeAddress,
    isReady,
    initError,
  };
}
