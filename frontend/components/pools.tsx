import { Pool } from "@/lib/amm";
import Link from "next/link";

export interface PoolsListProps {
  pools: Pool[];
}

export function PoolsList({ pools }: PoolsListProps) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 place-items-center w-full bg-gray-900 justify-between p-4 font-semibold text-sm">
        <span>ID</span>
        <span>Token Pair</span>
        <span>Fee</span>
        <span>Liquidity</span>
        <span>Total Volume</span>
        <span>Fees Collected</span>
        <span>Swaps</span>
      </div>
      {pools.map((pool) => (
        <PoolListItem
          key={`pool-${pool["token-0"]}-${pool["token-1"]}`}
          pool={pool}
        />
      ))}
    </div>
  );
}

export function PoolListItem({ pool }: { pool: Pool }) {
  const token0Name = pool["token-0"].split(".")[1];
  const token1Name = pool["token-1"].split(".")[1];
  const feesInPercentage = pool.fee / 10_000;

  // Format numbers for display
  const formatAmount = (amount: number) => {
    const formatted = amount / 1_000_000;
    // Show more decimals for small amounts, or use raw value if very small
    if (formatted < 0.01 && amount > 0) {
      return `${amount} (raw)`;
    }
    return formatted.toFixed(2);
  };

  const totalVolume = pool["total-volume-0"] + pool["total-volume-1"];

  return (
    <div className="grid grid-cols-7 place-items-center w-full bg-gray-800 justify-between p-4 text-sm">
      <span className="truncate w-24" title={pool.id}>{pool.id.substring(0, 8)}...</span>
      <div className="flex items-center gap-2">
        <Link
          href={`https://explorer.hiro.so/txid/${pool["token-0"]}?chain=testnet`}
          target="_blank"
        >
          {token0Name}
        </Link>{" "}
        /
        <Link
          href={`https://explorer.hiro.so/txid/${pool["token-1"]}?chain=testnet`}
          target="_blank"
        >
          {token1Name}
        </Link>
      </div>
      <span>{feesInPercentage}%</span>
      <div className="flex flex-col items-center text-xs">
        <span>{formatAmount(pool["balance-0"])} {token0Name}</span>
        <span>{formatAmount(pool["balance-1"])} {token1Name}</span>
      </div>
      <span>{formatAmount(totalVolume)}</span>
      <span>{formatAmount(pool["total-fees-collected"])}</span>
      <span>{pool["swap-count"]}</span>
    </div>
  );
}
