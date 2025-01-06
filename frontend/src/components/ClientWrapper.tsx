"use client";

import { DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, defineChain } from "viem";
import { createContext, useContext, useState, useEffect } from "react";

const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

if (!ENVIRONMENT_ID) {
  console.error('Missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID in .env.local');
}

const polygonTestnet = defineChain({
  id: 80002,
  name: "Polygon Amoy Testnet",
  network: "polygonAmoy",
  nativeCurrency: {
    name: "Polygon Amoy Testnet",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology/"],
    },
    public: {
      http: ["https://rpc-amoy.polygon.technology/"],
    },
  },
  blockExplorers: {
    default: { name: "Polygon Scan", url: "https://amoy.polygonscan.com/" },
  },
  testnet: true,
});

const sepoliaTestnet = defineChain({
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'SEth',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.org'],
    },
    public: {
      http: ['https://rpc.sepolia.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Sepolia Scan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
});

const evmNetworks = [
  {
    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
    chainId: 80002,
    chainName: "Polygon Amoy Testnet",
    iconUrls: ["https://ethglobal.b-cdn.net/organizations/qy8m3/square-logo/default.png"],
    name: "POL",
    nativeCurrency: {
      name: "Polygon Amoy Testnet",
      symbol: "POL",
      decimals: 18,
    },
    networkId: 80002,
    rpcUrls: ["https://rpc-amoy.polygon.technology/"],
    vanityName: "Polygon Amoy Testnet",
  },
  {
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    chainId: 11155111,
    chainName: "Sepolia",
    iconUrls: ["https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.webp"],
    name: "Sepolia",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "SEth",
      decimals: 18,
    },
    networkId: 11155111,
    rpcUrls: ["https://rpc.sepolia.org"],
    vanityName: "Sepolia Testnet",
  }
];

export const wagmiConfig = createConfig({
  chains: [polygonTestnet, sepoliaTestnet],
  multiInjectedProviderDiscovery: true,
  transports: {
    [polygonTestnet.id]: http(),
    [sepoliaTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export const dynamicConfig = {
  environmentId: ENVIRONMENT_ID || '',
  walletConnectors: [EthereumWalletConnectors],
  overrides: { 
    evmNetworks,
  },
  settings: {
    debug: process.env.NODE_ENV === 'development',
    walletConnectorExtensions: [],
  },
};

export const WalletContext = createContext<{
  isWalletConnected: boolean;
  primaryWallet: { address: string } | null;
}>({
  isWalletConnected: false,
  primaryWallet: null
});

export const useWallet = () => useContext(WalletContext);

// Inner component to handle wallet state
function WalletStateProvider({ children }: { children: React.ReactNode }) {
  const { primaryWallet } = useDynamicContext();
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    setIsWalletConnected(!!primaryWallet);
  }, [primaryWallet]);

  return (
    <WalletContext.Provider value={{ isWalletConnected, primaryWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ENVIRONMENT_ID) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-6 bg-red-500/10 rounded-xl">
          <h1 className="text-xl font-semibold mb-2">Configuration Error</h1>
          <p className="text-gray-300">
            Missing Dynamic environment ID. Please add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to your .env.local file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DynamicContextProvider settings={dynamicConfig}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <WalletStateProvider>
              {children}
            </WalletStateProvider>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
} 