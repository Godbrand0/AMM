import { STACKS_TESTNET } from "@stacks/network";
import {
  boolCV,
  bufferCV,
  Cl,
  cvToHex,
  fetchCallReadOnlyFunction,
  hexToCV,
  principalCV,
  PrincipalCV,
  uintCV,
  UIntCV,
} from "@stacks/transactions";


// REPLACE THESE WITH YOUR OWN
const AMM_CONTRACT_ADDRESS = "ST262V9NFZ5TCQDQM1R2BSXSE84NJBXN61HM909Z0";
const AMM_CONTRACT_NAME = "amm4";
const AMM_CONTRACT_PRINCIPAL = `${AMM_CONTRACT_ADDRESS}.${AMM_CONTRACT_NAME}`;

type ContractEvent = {
  event_index: number;
  event_type: string;
  tx_id: string;
  contract_log: {
    contract_id: string;
    topic: string;
    value: {
      hex: string;
      repr: string;
    };
  };
};

type PoolCV = {
  "token-0": PrincipalCV;
  "token-1": PrincipalCV;
  fee: UIntCV;
  liquidity: UIntCV;
  "balance-0": UIntCV;
  "balance-1": UIntCV;
  "total-volume-0": UIntCV;
  "total-volume-1": UIntCV;
  "total-fees-collected": UIntCV;
  "swap-count": UIntCV;
};

export type Pool = {
  id: string;
  "token-0": string;
  "token-1": string;
  fee: number;
  liquidity: number;
  "balance-0": number;
  "balance-1": number;
  "total-volume-0": number;
  "total-volume-1": number;
  "total-fees-collected": number;
  "swap-count": number;
};

// getAllPools
// Returns an array of Pool objects
export async function getAllPools() {
  let offset = 0;
  let done = false;

  const pools: Pool[] = [];

  // We can fetch 50 events at a time, so we run a loop until we've fetched all events
  while (!done) {
    const url = `https://api.testnet.hiro.so/extended/v1/contract/${AMM_CONTRACT_PRINCIPAL}/events?limit=50&offset=${offset}`;
    const events = (await fetch(url).then((res) => res.json()))
      .results as ContractEvent[];

    // if at any point we're getting less than 50 events back, then this is the last iteration
    if (events.length < 50) {
      done = true;
    }

    // from all events from the smart contract, only keep those which are `smart_contract_log` (remove token transfers, etc)
    const filteredEvents = events.filter((event: ContractEvent) => {
      return event.event_type === "smart_contract_log";
    });

    for (const event of filteredEvents) {
      const contractLog = event.contract_log;
      if (contractLog.contract_id !== AMM_CONTRACT_PRINCIPAL) continue;
      if (contractLog.topic !== "print") continue;

      // for each event, only care about ones which have action = "create-pool"
      const data = hexToCV(contractLog.value.hex);
      if (data.type !== "tuple") continue;
      if (data.value["action"] === undefined) continue;
      if (data.value["action"].type !== "ascii") continue;
      if (data.value["action"]["value"] !== "create-pool") continue;
      if (data.value["data"].type !== "tuple") continue;

      const poolInitialData = data.value["data"].value as PoolCV;

      // get the pool id from the pool initial data
      const poolIdResult = await fetchCallReadOnlyFunction({
        contractAddress: AMM_CONTRACT_ADDRESS,
        contractName: AMM_CONTRACT_NAME,
        functionName: "get-pool-id",
        functionArgs: [
          Cl.tuple({
            "token-0": poolInitialData["token-0"],
            "token-1": poolInitialData["token-1"],
            fee: poolInitialData.fee,
          }),
        ],
        senderAddress: AMM_CONTRACT_ADDRESS,
        network: STACKS_TESTNET,
      });
      if (poolIdResult.type !== "buffer") continue;
      const poolId = poolIdResult.value;

      // get the pool data from the pool id
      const poolDataResult = await fetchCallReadOnlyFunction({
        contractAddress: AMM_CONTRACT_ADDRESS,
        contractName: AMM_CONTRACT_NAME,
        functionName: "get-pool-data",
        functionArgs: [poolIdResult],
        senderAddress: AMM_CONTRACT_ADDRESS,
        network: STACKS_TESTNET,
      });

      if (poolDataResult.type !== "ok") continue;
      if (poolDataResult.value.type !== "some") continue;
      if (poolDataResult.value.value.type !== "tuple") continue;

      const poolData = poolDataResult.value.value.value as any;

      // Helper to safely parse uint values
      const parseUintCV = (cv: any): number => {
        if (!cv) return 0;
        if (cv.type === "uint") {
          return Number(cv.value);
        }
        return 0;
      };

      // convert the pool data to a Pool object
      const pool: Pool = {
        id: poolId,
        "token-0": poolInitialData["token-0"].value,
        "token-1": poolInitialData["token-1"].value,
        fee: parseInt(poolInitialData["fee"].value.toString()),
        liquidity: Number(poolData["liquidity"].value),
        "balance-0": Number(poolData["balance-0"].value),
        "balance-1": Number(poolData["balance-1"].value),
        "total-volume-0": parseUintCV(poolData["total-volume-0"]),
        "total-volume-1": parseUintCV(poolData["total-volume-1"]),
        "total-fees-collected": parseUintCV(poolData["total-fees-collected"]),
        "swap-count": parseUintCV(poolData["swap-count"]),
      };

      pools.push(pool);

      offset = event.event_index;
    }
  }

  return pools;
}

export async function createPool(token0: string, token1: string, fee: number) {
  const token0Hex = cvToHex(principalCV(token0));
  const token1Hex = cvToHex(principalCV(token1));

  // Sort the tokens properly here
  if (token0Hex > token1Hex) {
    [token0, token1] = [token1, token0];
  }

  const txOptions = {
    contractAddress: AMM_CONTRACT_ADDRESS,
    contractName: AMM_CONTRACT_NAME,
    functionName: "create-pool",
    functionArgs: [principalCV(token0), principalCV(token1), uintCV(fee)],
  };

  return txOptions;
}

export async function addLiquidity(
  pool: Pool,
  amount0: number,
  amount1: number
) {
  if (amount0 === 0 || amount1 === 0) {
    throw new Error("Cannot add liquidity with 0 amount");
  }

  // If this is not initial liquidity, we need to add amounts in a ratio of the price
  if (pool.liquidity > 0) {
    const poolRatio = pool["balance-0"] / pool["balance-1"];

    const idealAmount1 = Math.floor(amount0 / poolRatio);
    if (amount1 < idealAmount1) {
      throw new Error(
        `Cannot add liquidity in these amounts. You need to supply at least ${idealAmount1} ${
          pool["token-1"].split(".")[1]
        } along with ${amount0} ${pool["token-0"].split(".")[1]}`
      );
    }
  }

  const txOptions = {
    contractAddress: AMM_CONTRACT_ADDRESS,
    contractName: AMM_CONTRACT_NAME,
    functionName: "add-liquidity",
    functionArgs: [
      principalCV(pool["token-0"]),
      principalCV(pool["token-1"]),
      uintCV(pool.fee),
      uintCV(amount0),
      uintCV(amount1),
      uintCV(0),
      uintCV(0),
    ],
  };

  return txOptions;
}

export async function removeLiquidity(pool: Pool, liquidity: number) {
  const txOptions = {
    contractAddress: AMM_CONTRACT_ADDRESS,
    contractName: AMM_CONTRACT_NAME,
    functionName: "remove-liquidity",
    functionArgs: [
      principalCV(pool["token-0"]),
      principalCV(pool["token-1"]),
      uintCV(pool.fee),
      uintCV(liquidity),
    ],
  };

  return txOptions;
}

export async function swap(pool: Pool, amount: number, zeroForOne: boolean) {
  const txOptions = {
    contractAddress: AMM_CONTRACT_ADDRESS,
    contractName: AMM_CONTRACT_NAME,
    functionName: "swap",
    functionArgs: [
      principalCV(pool["token-0"]),
      principalCV(pool["token-1"]),
      uintCV(pool.fee),
      uintCV(amount),
      boolCV(zeroForOne),
    ],
  };

  return txOptions;
}

export async function getUserLiquidity(pool: Pool, user: string) {
  const userLiquidityResult = await fetchCallReadOnlyFunction({
    contractAddress: AMM_CONTRACT_ADDRESS,
    contractName: AMM_CONTRACT_NAME,
    functionName: "get-position-liquidity",
    functionArgs: [bufferCV(Buffer.from(pool.id, "hex")), principalCV(user)],
    senderAddress: AMM_CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });

  if (userLiquidityResult.type !== "ok") return 0;
  if (userLiquidityResult.value.type !== "uint") return 0;
  return parseInt(userLiquidityResult.value.value.toString());
}

export async function getTokenBalance(tokenContract: string, user: string) {
  const [contractAddress, contractName] = tokenContract.split(".");

  const balanceResult = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-balance",
    functionArgs: [principalCV(user)],
    senderAddress: user,
    network: STACKS_TESTNET,
  });

  if (balanceResult.type !== "ok") return 0;
  if (balanceResult.value.type !== "uint") return 0;
  return parseInt(balanceResult.value.value.toString());
}

export type Transaction = {
  txId: string;
  action: string;
  timestamp: number;
  blockHeight: number;
  token0?: string;
  token1?: string;
  amount0?: number;
  amount1?: number;
  liquidity?: number;
  fee?: number;
  zeroForOne?: boolean;
  sender: string;
};

export async function getUserTransactionHistory(userAddress: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  let offset = 0;
  let totalFetched = 0;
  const maxTransactions = 100; // Limit to 100 most recent transactions

  try {
    while (totalFetched < maxTransactions) {
      const url = `https://api.testnet.hiro.so/extended/v1/address/${userAddress}/transactions?limit=50&offset=${offset}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) break;

      for (const tx of data.results) {
        // Only process successful transactions
        if (tx.tx_status !== "success") continue;

        // Only process contract calls to our AMM
        if (tx.tx_type !== "contract_call") continue;
        if (tx.contract_call?.contract_id !== AMM_CONTRACT_PRINCIPAL) continue;

        const functionName = tx.contract_call.function_name;

        // Parse transaction based on function called
        let transaction: Transaction = {
          txId: tx.tx_id,
          action: functionName,
          timestamp: tx.burn_block_time,
          blockHeight: tx.block_height,
          sender: tx.sender_address,
        };

        // Get transaction details from events
        if (tx.events && tx.events.length > 0) {
          for (const event of tx.events) {
            if (event.event_type === "smart_contract_log" && event.contract_log) {
              const logData = hexToCV(event.contract_log.value.hex);
              if (logData.type === "tuple") {
                const data = logData.value["data"];
                if (data && data.type === "tuple") {
                  const eventData = data.value;

                  // Extract amounts and other data based on action
                  const amount0 = eventData["amount-0"];
                  if (amount0 && amount0.type === "uint") {
                    transaction.amount0 = parseInt(amount0.value.toString());
                  }
                  const amount1 = eventData["amount-1"];
                  if (amount1 && amount1.type === "uint") {
                    transaction.amount1 = parseInt(amount1.value.toString());
                  }
                  const liquidity = eventData["liquidity"];
                  if (liquidity && liquidity.type === "uint") {
                    transaction.liquidity = parseInt(liquidity.value.toString());
                  }
                  const fee = eventData["fee"];
                  if (fee && fee.type === "uint") {
                    transaction.fee = parseInt(fee.value.toString());
                  }
                  const zeroForOne = eventData["zero-for-one"];
                  if (zeroForOne && "value" in zeroForOne) {
                    const val = (zeroForOne as any).value;
                    if (typeof val === "boolean") {
                      transaction.zeroForOne = val;
                    }
                  }
                  const token0 = eventData["token-0"];
                  if (token0 && "value" in token0) {
                    const val = (token0 as any).value;
                    if (typeof val === "string") {
                      transaction.token0 = val;
                    }
                  }
                  const token1 = eventData["token-1"];
                  if (token1 && "value" in token1) {
                    const val = (token1 as any).value;
                    if (typeof val === "string") {
                      transaction.token1 = val;
                    }
                  }
                }
              }
            }
          }
        }

        // Parse from function args (most reliable source)
        if (tx.contract_call.function_args) {
          const args = tx.contract_call.function_args;

          // Extract token principals - always in first two args for all AMM functions
          if (!transaction.token0 && args[0] && args[0].type === "principal") {
            transaction.token0 = args[0].value;
          }
          if (!transaction.token1 && args[1] && args[1].type === "principal") {
            transaction.token1 = args[1].value;
          }

          // Helper function to parse uint values from repr
          const parseUint = (repr: string): number => {
            // Remove 'u' prefix if present (e.g., "u1000000" -> "1000000")
            const cleanValue = repr.replace(/^u/, '');
            return parseInt(cleanValue, 10);
          };

          // Parse amounts based on function name
          if (functionName === "create-pool" && args[2]) {
            if (!transaction.fee) transaction.fee = parseUint(args[2].repr);
          } else if (functionName === "add-liquidity") {
            if (!transaction.amount0 && args[3]) transaction.amount0 = parseUint(args[3].repr);
            if (!transaction.amount1 && args[4]) transaction.amount1 = parseUint(args[4].repr);
          } else if (functionName === "remove-liquidity" && args[3]) {
            if (!transaction.liquidity) transaction.liquidity = parseUint(args[3].repr);
          } else if (functionName === "swap") {
            if (!transaction.amount0 && args[3]) transaction.amount0 = parseUint(args[3].repr);
            if (!transaction.zeroForOne && args[4] && args[4].type === "bool") {
              transaction.zeroForOne = args[4].value;
            }
          }
        }

        transactions.push(transaction);
        totalFetched++;

        if (totalFetched >= maxTransactions) break;
      }

      offset += 50;

      // If we got less than 50 results, we've reached the end
      if (data.results.length < 50) break;
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
}
