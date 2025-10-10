"use client";
import { getTokenBalance } from "@/lib/amm";
import { useEffect, useState } from "react";

interface TokenBalanceProps {
  userAddress: string;
}

export function TokenBalance({ userAddress }: TokenBalanceProps) {
  const [token1Balance, setToken1Balance] = useState<number | null>(null);
  const [token2Balance, setToken2Balance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Replace these with your actual deployed token contract addresses
  const TOKEN1_CONTRACT = "ST262V9NFZ5TCQDQM1R2BSXSE84NJBXN61HM909Z0.mock-token-6";
  const TOKEN2_CONTRACT = "ST262V9NFZ5TCQDQM1R2BSXSE84NJBXN61HM909Z0.mock-token-7";

  useEffect(() => {
    async function fetchBalances() {
      setLoading(true);
      try {
        const [balance1, balance2] = await Promise.all([
          getTokenBalance(TOKEN1_CONTRACT, userAddress),
          getTokenBalance(TOKEN2_CONTRACT, userAddress),
        ]);
        setToken1Balance(balance1);
        setToken2Balance(balance2);
      } catch (error) {
        console.error("Error fetching token balances:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userAddress) {
      fetchBalances();
    }
  }, [userAddress]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg">
        <span className="text-sm text-gray-400">Loading balances...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-300">MT1:</span>
        <span className="text-sm text-white">
          {token1Balance !== null ? (token1Balance / 1_000_000).toFixed(2) : "0.00"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-300">MT2:</span>
        <span className="text-sm text-white">
          {token2Balance !== null ? (token2Balance / 1_000_000).toFixed(2) : "0.00"}
        </span>
      </div>
    </div>
  );
}
