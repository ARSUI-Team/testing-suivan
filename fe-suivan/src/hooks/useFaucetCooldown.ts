"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SUI_CLOCK_ID, SUI_PACKAGE_ID } from "@/config/sui";
import { useFaucetId } from "@/config/sui";

export const FAUCET_COOLDOWN_MS = 86_400_000;
export const FAUCET_COOLDOWN_S = 86_400;
const LS_KEY = "suivan_faucet_claim";

function lsKey(address?: string) {
  return address ? `${LS_KEY}_${address}` : "";
}

function readLsLastClaim(address?: string): number {
  if (typeof window === "undefined" || !address) return 0;
  const raw = localStorage.getItem(lsKey(address));
  return raw ? Number(raw) || 0 : 0;
}

function writeLsLastClaim(address: string | undefined) {
  if (typeof window !== "undefined" && address) {
    localStorage.setItem(lsKey(address), String(Date.now()));
  }
}

function optimisticCooldownSec(address?: string): number {
  const last = readLsLastClaim(address);
  if (!last) return 0;
  const elapsed = Date.now() - last;
  return Math.max(0, Math.ceil((FAUCET_COOLDOWN_MS - elapsed) / 1000));
}

function formatHHMMSS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * useFaucetCooldown
 *
 * Queries the on-chain faucet `cooldown_remaining()` for the connected wallet.
 * Source of truth = on-chain. localStorage is used as optimistic cache so the
 * UI shows the timer immediately on mount before the RPC resolves.
 *
 * Usage:
 *   const {
 *     cooldownMs,      // remaining ms from chain (0 if ready)
 *     cooldownSec,     // remaining seconds (live ticking)
 *     cooldownActive,  // boolean
 *     formattedTime,   // "HH:MM:SS"
 *     ready,           // opposite of cooldownActive
 *     isLoading,       // initial fetch loading
 *     refetch,         // manually refetch from chain
 *     markClaimed,     // optimistic: write localStorage + invalidate + prime cache
 *   } = useFaucetCooldown();
 */
export function useFaucetCooldown() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const address = account?.address;
  const faucetId = useFaucetId();
  const queryClient = useQueryClient();

  // Live ticking seconds. Initialized from localStorage for instant UX.
  const [tickSec, setTickSec] = useState<number>(() => optimisticCooldownSec(address));

  // Track which address the optimistic value was for; reset on wallet change.
  const lastAddrRef = useRef<string | undefined>(address);
  useEffect(() => {
    if (address !== lastAddrRef.current) {
      lastAddrRef.current = address;
      setTickSec(optimisticCooldownSec(address));
    }
  }, [address]);

  const queryKey = useMemo(
    () => ["suivan", "faucetCooldown", address, faucetId] as const,
    [address, faucetId],
  );

  const { data, isLoading, refetch } = useQuery<number>({
    queryKey,
    queryFn: async () => {
      if (!address || !faucetId) return 0;
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${SUI_PACKAGE_ID}::faucet::cooldown_remaining`,
          arguments: [
            tx.object(faucetId),
            tx.pure.address(address),
            tx.object(SUI_CLOCK_ID),
          ],
        });
        const result = await client.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: address,
        });
        const bytes = result?.results?.[0]?.returnValues?.[0]?.[0];
        if (!bytes) return 0;
        // u64 little-endian → number. Max cooldown is 86_400_000 ms which is
        // well within Number.MAX_SAFE_INTEGER, so plain Number math is safe.
        const ms = fromLEU64(bytes);
        // Persist to localStorage as cache so reloads stay optimistic & in sync.
        if (ms > 0) {
          // Store a synthetic "last claim" timestamp so optimistic logic matches.
          const synthetic = Date.now() - (FAUCET_COOLDOWN_MS - ms);
          if (typeof window !== "undefined") {
            localStorage.setItem(lsKey(address), String(synthetic));
          }
        }
        return ms;
      } catch {
        // Fallback to localStorage optimistic value on RPC error.
        return optimisticCooldownSec(address) * 1000;
      }
    },
    enabled: !!address && !!faucetId,
    // Poll every 30s while active; react-query also keeps data fresh on focus.
    refetchInterval: (q) => (q.state.data && q.state.data > 0 ? 30_000 : false),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  // chain cooldown in ms (0 means ready). Optimistic fallback while loading.
  const chainMs = data ?? optimisticCooldownSec(address) * 1000;

  // When new chain data arrives, reset the ticking baseline.
  useEffect(() => {
    setTickSec(Math.ceil(chainMs / 1000));
  }, [chainMs]);

  // Tick down every second while active.
  const cooldownActive = tickSec > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => {
      setTickSec((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownActive]);

  const markClaimed = useCallback(() => {
    if (!address) return;
    writeLsLastClaim(address);
    // Prime the query cache so UI immediately flips to countdown.
    queryClient.setQueryData(queryKey, FAUCET_COOLDOWN_MS);
    setTickSec(FAUCET_COOLDOWN_S);
    // Then verify against chain shortly after.
    setTimeout(() => refetch(), 2_000);
  }, [address, queryClient, queryKey, refetch]);

  return {
    cooldownMs: tickSec * 1000,
    cooldownSec: tickSec,
    cooldownActive,
    ready: !cooldownActive,
    formattedTime: formatHHMMSS(tickSec),
    isLoading,
    refetch,
    markClaimed,
  };
}

/** Helper: decode little-endian u64 bytes to number (safe for faucet cooldown range).
 *  Input may be Uint8Array or iterable of bytes from mysten devInspect. */
function fromLEU64(bytes: Uint8Array | Iterable<number>): number {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  let v = 0;
  for (let i = 0; i < 8 && i < arr.length; i++) {
    v += arr[i] * Math.pow(256, i);
  }
  return v;
}

// Re-export for components that want to format on their own.
export { formatHHMMSS as formatCooldown };
