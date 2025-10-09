"use client";
import { getUserTransactionHistory, Transaction } from "@/lib/amm";
import { useEffect, useState } from "react";

interface TransactionHistoryProps {
  userAddress: string;
}

export function TransactionHistory({ userAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const history = await getUserTransactionHistory(userAddress);
        console.log("Fetched transaction history:", history);
        setTransactions(history);
      } catch (error) {
        console.error("Error fetching transaction history:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userAddress) {
      fetchHistory();
    }
  }, [userAddress]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTokenName = (tokenPrincipal?: string, fallback?: string) => {
    if (!tokenPrincipal || tokenPrincipal === "") {
      return fallback || "Token";
    }
    // Token principal format: ADDRESS.CONTRACT_NAME
    const parts = tokenPrincipal.split(".");
    if (parts.length >= 2) {
      return parts[1]; // Return contract name
    }
    return tokenPrincipal; // Return as-is if no dot separator
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "N/A";
    return (amount / 1_000_000).toFixed(6);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create-pool":
        return "text-green-400";
      case "add-liquidity":
        return "text-blue-400";
      case "remove-liquidity":
        return "text-yellow-400";
      case "swap":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create-pool":
        return "Pool Created";
      case "add-liquidity":
        return "Liquidity Added";
      case "remove-liquidity":
        return "Liquidity Removed";
      case "swap":
        return "Token Swap";
      default:
        return action;
    }
  };

  const renderTransactionDetails = (tx: Transaction) => {
    switch (tx.action) {
      case "create-pool":
        return (
          <div className="text-sm text-gray-400">
            Created pool: {formatTokenName(tx.token0, "MT1")} / {formatTokenName(tx.token1, "MT2")}
            {tx.fee !== undefined && ` (Fee: ${tx.fee / 100}%)`}
          </div>
        );
      case "add-liquidity":
        return (
          <div className="text-sm text-gray-400">
            Added {formatAmount(tx.amount0)} {formatTokenName(tx.token0, "MT1")} + {formatAmount(tx.amount1)} {formatTokenName(tx.token1, "MT2")}
          </div>
        );
      case "remove-liquidity":
        return (
          <div className="text-sm text-gray-400">
            Removed {formatAmount(tx.liquidity)} liquidity from {formatTokenName(tx.token0, "MT1")} / {formatTokenName(tx.token1, "MT2")}
          </div>
        );
      case "swap":
        return (
          <div className="text-sm text-gray-400">
            Swapped {formatAmount(tx.amount0)} {tx.zeroForOne ? formatTokenName(tx.token0, "MT1") : formatTokenName(tx.token1, "MT2")}
            {" → "} {tx.zeroForOne ? formatTokenName(tx.token1, "MT2") : formatTokenName(tx.token0, "MT1")}
          </div>
        );
      default:
        return <div className="text-sm text-gray-400">Unknown action</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-400">Loading transaction history...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-400">No AMM transactions found for this address.</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Action</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Details</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={tx.txId} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}`}>
                <td className="px-4 py-3">
                  <span className={`font-medium ${getActionColor(tx.action)}`}>
                    {getActionLabel(tx.action)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {renderTransactionDetails(tx)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {formatTimestamp(tx.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://explorer.hiro.so/txid/${tx.txId}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {tx.txId.substring(0, 8)}...
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
