"use client";
import { TransactionHistory } from "@/components/transaction-history";
import { useStacks } from "@/hooks/use-stacks";

export default function HistoryPage() {
  const { userData } = useStacks();

  return (
    <div className="flex flex-col items-center p-8 gap-6">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-gray-400 mb-6">View all your AMM transactions</p>

        {userData ? (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <TransactionHistory userAddress={userData.profile.stxAddress.testnet} />
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-700 text-center">
            <p className="text-gray-400">Please connect your wallet to view transaction history</p>
          </div>
        )}
      </div>
    </div>
  );
}
