"use client";

import { useStacks } from "@/hooks/use-stacks";
import { useState } from "react";

export function CreatePool() {
  const { handleCreatePool } = useStacks();
  const [token0, setToken0] = useState("");
  const [token1, setToken1] = useState("");
  const [fee, setFee] = useState(500);

  const isValidPrincipal = (value: string) => {
    // Check if it matches the format ADDRESS.CONTRACT_NAME
    const parts = value.split(".");
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  };

  const isFormValid = isValidPrincipal(token0) && isValidPrincipal(token1);

  return (
    <div className="flex flex-col max-w-md w-full gap-4 p-6 border border-gray-500 rounded-md">
      <h1 className="text-xl font-bold">Create New Pool</h1>
      <div className="flex flex-col gap-1">
        <span className="font-bold">Token 0</span>
        <input
          type="text"
          className="border-2 border-gray-500 rounded-lg px-4 py-2 text-white"
          placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-a"
          value={token0}
          onChange={(e) => setToken0(e.target.value)}
        />
        <span className="text-xs text-gray-400">
          Format: ADDRESS.CONTRACT_NAME
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">Token 1</span>
        <input
          type="text"
          className="border-2 border-gray-500 rounded-lg px-4 py-2 text-white"
          placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-b"
          value={token1}
          onChange={(e) => setToken1(e.target.value)}
        />
        <span className="text-xs text-gray-400">
          Format: ADDRESS.CONTRACT_NAME
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">Fee (basis points)</span>
        <input
          type="number"
          className="border-2 border-gray-500 text-white rounded-lg px-4 py-2"
          placeholder="500"
          max={10_000}
          min={0}
          value={fee}
          onChange={(e) => setFee(parseInt(e.target.value))}
        />
        <span className="text-xs text-gray-400">
          500 = 5%, 100 = 1%, 30 = 0.3%
        </span>
      </div>

      <button
        onClick={() => handleCreatePool(token0, token1, fee)}
        disabled={!isFormValid}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        Create Pool
      </button>
    </div>
  );
}
