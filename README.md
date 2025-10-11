# AMM Project - Feature Updates

This document outlines the features added to the AMM (Automated Market Maker) project, including smart contract changes, frontend integration, and issues encountered during development.

---

## Features Added

### 1. Token Balance Display
**Purpose**: Show users their balance of mock-token1 (MT1) and mock-token2 (MT2)

**Changes Made**:
- Created `TokenBalance` component in `frontend/components/token-balance.tsx`
- Added `getTokenBalance` function to fetch balances from blockchain
- Integrated into navbar for easy visibility

**Code Snippet**:
```typescript
export async function getTokenBalance(
  tokenContract: string,
  address: string
): Promise<number> {
  // Fetches balance using Stacks.js
}
```

---

### 2. Transaction History
**Purpose**: Display history of all AMM transactions (swaps, add/remove liquidity)

**Changes Made**:
- Created `getUserTransactionHistory` function in `frontend/lib/amm.ts`
- Created `TransactionHistory` component in `frontend/components/transaction-history.tsx`
- Added `/history` page to display transaction list
- Added navigation link to access history page


**Code Snippet**:
```typescript
export async function getUserTransactionHistory(address: string) {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/address/${address}/transactions`
  );
  // Parses and returns transaction data
}
```

---

### 3. Pool Statistics Tracking
**Purpose**: Track trading volume, fees collected, and swap count for each pool

#### Smart Contract Changes (`contracts/amm4.clar`)

**Added 4 statistics fields to pool data**:
```clarity
total-volume-0: uint,          ;; Total token-0 swapped in
total-volume-1: uint,          ;; Total token-1 swapped in
total-fees-collected: uint,    ;; Total fees earned
swap-count: uint               ;; Number of swaps
```

**Modified `create-pool` function**:
- Initializes all statistics to `u0` when pool is created

**Modified `swap` function**:
- Tracks which token is being swapped in and updates appropriate volume counter
- Accumulates fees from each swap
- Increments swap counter

**Code Snippet**:
```clarity
;; Update statistics based on swap direction
(new-volume-0 (if zero-for-one (+ current-volume-0 input-amount) current-volume-0))
(new-volume-1 (if zero-for-one current-volume-1 (+ current-volume-1 input-amount)))
(new-fees (+ current-fees fees))
(new-swap-count (+ current-swap-count u1))
```

#### Frontend Integration

**Updated `frontend/lib/amm.ts`**:
- Added statistics fields to `Pool` type
- Modified `getAllPools` to parse statistics from blockchain
- Created helper function to parse uint values correctly

**Code Snippet**:
```typescript
const parseUintCV = (cv: any): number => {
  if (!cv) return 0;
  if (cv.type === "uint") {
    return Number(cv.value);
  }
  return 0;
};
```

**Updated `frontend/components/pools.tsx`**:
- Expanded table from 4 to 7 columns to display statistics
- Added smart formatting to handle small values

**Code Snippet**:
```typescript
const formatAmount = (amount: number) => {
  const formatted = amount / 1_000_000;
  if (formatted < 0.01 && amount > 0) {
    return `${amount} (raw)`;  // Show raw value for very small amounts
  }
  return formatted.toFixed(2);
};
```

#### Testing

**Created tests in `tests/amm.test.ts`**:
- Test 1: Verifies statistics initialize to zero on pool creation
- Test 2: Verifies statistics update when swaps occur

---

## Issues Encountered and Solutions

### 1. Contract Redeployment Naming
**Problem**: When redeploying contracts, had to change from `amm2` → `amm4` and `mock-token-4/5` → `mock-token-6/7`

**Solution**: Updated contract names in frontend configuration:
```typescript
const AMM_CONTRACT_NAME = "amm4";
const MOCK_TOKEN_ONE_CONTRACT_NAME = "mock-token-6";
const MOCK_TOKEN_TWO_CONTRACT_NAME = "mock-token-7";
```

### 2. Pool Statistics Showing 0.00
**Problem**: Frontend displayed "0.00" for volume and fees even though values existed in console logs

**Root Cause**: Values like 3777 tokens ÷ 1,000,000 (for 6 decimals) = 0.003777, which rounds to 0.00

**Solution**: Modified display logic to show raw values when formatted value < 0.01

### 3. TypeScript Errors with ClarityValue
**Problem**: Accessing nested properties in ClarityValue objects caused TypeScript errors

**Solution**: Created helper parsing functions and used proper type checking:
```typescript
if (cv.type === "uint") {
  return Number(cv.value);
}
```

### 4. Transaction History Display Issues
**Problem**:
- Transaction amounts showing "NaN"
- Token names showing "N/A"

**Solution**:
- Fixed amount parsing by correctly extracting values from nested ClarityValue structure
- Added fallback token names "MT1" and "MT2" when metadata unavailable

---

## How Statistics Work

### Total Volume
Tracks cumulative amounts of tokens swapped into the pool:
- When swapping token-0 → token-1: Adds to `total-volume-0`
- When swapping token-1 → token-0: Adds to `total-volume-1`

### Fees Collected
Calculated on each swap:
```clarity
fees = (output-amount * fee) / 10000
```
- Example: 0.3% fee (30/10000) on 1000 tokens = 3 tokens
- Fees stay in the pool and accumulate

### Swap Count
Simple counter incremented by 1 on each swap transaction

---

## Deployment Notes

**Current Contract Versions**:
- AMM Contract: `amm4`
- Mock Token 1: `mock-token-6`
- Mock Token 2: `mock-token-7`

**After making contract changes**: Always redeploy and update contract names in frontend configuration

---

## Testing

Run tests with:
```bash
npm test
```

All tests passing:
- Pool creation and initialization
- Liquidity operations
- Token swaps
- Statistics tracking

---

## Frontend Pages

- `/` - Pool management (view pools, add/remove liquidity, swap)
- `/history` - Transaction history for connected wallet
- Navbar shows token balances (MT1 and MT2)

---

## Technologies Used

- **Blockchain**: Stacks blockchain with Clarity smart contracts
- **Frontend**: Next.js 15.5.4, React 19, TypeScript
- **Blockchain Integration**: Stacks.js (@stacks/transactions)
- **Testing**: Clarinet with Vitest
- **API**: Hiro API for transaction history
