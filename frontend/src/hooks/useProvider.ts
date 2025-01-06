import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useProvider() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
    }
  }, []);

  return provider;
} 