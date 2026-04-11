import { NetworkId } from "@txnlab/use-wallet";

type NetworkName = "testnet" | "mainnet";

const network = (import.meta.env.VITE_ALGORAND_NETWORK || "testnet").toLowerCase() as NetworkName;

function defaultIndexerUrl(value: NetworkName): string {
  if (value === "mainnet") return "https://mainnet-idx.algonode.cloud";
  return "https://testnet-idx.algonode.cloud";
}

function defaultAlgodUrl(value: NetworkName): string {
  if (value === "mainnet") return "https://mainnet-api.algonode.cloud";
  return "https://testnet-api.algonode.cloud";
}

function walletNetwork(value: NetworkName): NetworkId {
  if (value === "mainnet") return NetworkId.MAINNET;
  return NetworkId.TESTNET;
}

function parseAppId(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export const appConfig = {
  network,
  walletNetwork: walletNetwork(network),
  algodUrl: import.meta.env.VITE_ALGOD_URL || defaultAlgodUrl(network),
  indexerUrl: import.meta.env.VITE_INDEXER_URL || defaultIndexerUrl(network),
  bridgeUrl: import.meta.env.VITE_AGENT_BRIDGE_URL || "",
  registryAppId: parseAppId(import.meta.env.VITE_REGISTRY_APP_ID || 0),
  escrowAppId: parseAppId(import.meta.env.VITE_ESCROW_APP_ID || 0),
};

export function isChainConfigured(): boolean {
  return appConfig.registryAppId > 0 && appConfig.escrowAppId > 0;
}

export function bridgeUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!appConfig.bridgeUrl) return cleanPath;
  return `${appConfig.bridgeUrl}${cleanPath}`;
}

export function txExplorerUrl(txId: string): string {
  if (appConfig.network === "mainnet") return `https://explorer.perawallet.app/tx/${txId}`;
  if (appConfig.network === "testnet") return `https://testnet.explorer.perawallet.app/tx/${txId}`;
  return `#${txId}`;
}
