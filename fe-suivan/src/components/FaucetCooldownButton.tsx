"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Droplets } from "lucide-react";
import { useClaimUSDC } from "@/hooks/useSuiContracts";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  useFaucetCooldown,
  FAUCET_COOLDOWN_S,
  formatCooldown,
} from "@/hooks/useFaucetCooldown";
import { useFaucetId } from "@/config/sui";
import { useSuccessToast, useErrorToast } from "@/components/Toast";

type Variant = "full" | "compact";

type ClaimStatus = "idle" | "loading" | "success" | "error";

interface Props {
  /** "full" = faucet-page style with progress bar + helper text.
   *  "compact" = pools-header / create-modal inline button. */
  variant?: Variant;
  /** Optional callback after a successful claim (e.g. refetch pool list).
   *  Receives the transaction digest if available. */
  onClaimed?: (digest?: string) => void;
  className?: string;
}

/**
 * FaucetCooldownButton
 *
 * Single source of truth for "Claim 500 USDC" / "Get Test USDC".
 * Uses on-chain `cooldown_remaining` via useFaucetCooldown and shows a live
 * HH:MM:SS countdown while the 24h cooldown is active.
 *
 * Same look & behavior everywhere it appears (faucet page, pools header,
 * create-pool modal).
 */
export function FaucetCooldownButton({
  variant = "compact",
  onClaimed,
  className = "",
}: Props) {
  const faucetId = useFaucetId();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const {
    cooldownSec,
    cooldownActive,
    formattedTime,
    refetch: refetchCooldown,
    markClaimed,
  } = useFaucetCooldown();

  const { claimUSDC, isPending: isWalletClaiming, hash, error } = useClaimUSDC();

  const [status, setStatus] = useState<ClaimStatus>("idle");
  const lastSavedHash = useRef<string | undefined>(undefined);
  const lastErrorRef = useRef<string | null>(null);

  // Watch successful wallet tx → mark claimed + success UI.
  useEffect(() => {
    if (!hash || hash === lastSavedHash.current) return;
    lastSavedHash.current = hash;
    if (status !== "loading") return;
    handleSuccess(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, status]);

  // Watch mutation errors → if cooldown abort, sync from chain.
  useEffect(() => {
    if (!error || status !== "loading") return;
    const msg = error.message || "";
    if (msg === lastErrorRef.current) return;
    lastErrorRef.current = msg;
    if (msg.includes("abort code: 1") || msg.includes("cooldown")) {
      // On-chain still locked. Refresh real cooldown & surface to user.
      refetchCooldown();
      setStatus("error");
      errorToast(
        "Faucet Cooldown",
        "1 claim per 24 hours. Try again later.",
      );
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    // Other errors: show generic and reset.
    setStatus("error");
    errorToast("Claim Failed", msg || "Transaction failed");
    setTimeout(() => setStatus("idle"), 3000);
  }, [error, status, errorToast, refetchCooldown]);

  const handleSuccess = useCallback(
    (digest?: string) => {
      setStatus("success");
      markClaimed();
      onClaimed?.(digest);
      successToast("Minted 500 USDC", digest ? `Tx: ${digest.slice(0, 10)}…${digest.slice(-4)}` : undefined);
      setTimeout(() => setStatus((s) => (s === "success" ? "idle" : s)), 3000);
    },
    [markClaimed, onClaimed, successToast],
  );

  const handleClaim = useCallback(() => {
    if (!faucetId) {
      errorToast("Faucet Unavailable", "Faucet is not configured for this network.");
      return;
    }
    if (cooldownActive || isWalletClaiming) return;

    setStatus("loading");
    lastSavedHash.current = undefined;
    lastErrorRef.current = null;
    claimUSDC(faucetId);
  }, [faucetId, cooldownActive, isWalletClaiming, claimUSDC, errorToast]);

  const isDisabled = !faucetId || isWalletClaiming || status === "loading" || cooldownActive;

  // ─── COMPACT variant (pools header / inline) ───────────────────────
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClaim}
        disabled={isDisabled}
        className={`protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] px-4 py-2 text-xs font-black shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
          status === "success"
            ? "bg-[var(--success-soft)] text-[var(--brutal-ink)]"
            : cooldownActive
            ? "bg-[var(--warn-soft)] text-[var(--brutal-ink)]"
            : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
        } ${className}`}
        title={cooldownActive ? `Next claim in ${formattedTime}` : "Get 500 test USDC"}
      >
        {status === "loading" || isWalletClaiming ? (
          <>
            <LoadingSpinner size="inline" /> Minting...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="size-3.5" />
            500 USDC Minted!
          </>
        ) : cooldownActive ? (
          <>
            <Clock className="size-3.5" />
            Cooldown {formatCooldown(cooldownSec)}
          </>
        ) : (
          <>
            <Droplets className="size-3.5" />
            Get Test USDC
          </>
        )}
      </button>
    );
  }

  // ─── FULL variant (faucet page hero button) ────────────────────────
  return (
    <div className={className}>
      <div className="relative">
        <button
          type="button"
          onClick={handleClaim}
          disabled={isDisabled}
          className={`protocol-font relative w-full border-[3px] border-[var(--brutal-ink)] px-5 py-3 text-xs font-black shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
            status === "success"
              ? "bg-[var(--success-soft)] text-[var(--brutal-ink)]"
              : cooldownActive
              ? "bg-[var(--warn-soft)] text-[var(--brutal-ink)]"
              : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-ink)] hover:text-[var(--brutal-accent)]"
          }`}
        >
          {status === "loading" || isWalletClaiming ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner size="inline" />
              Confirming in wallet...
            </span>
          ) : status === "success" ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-3.5" />
              Minted 500 USDC!
            </span>
          ) : cooldownActive ? (
            <span className="inline-flex items-center gap-2">
              <Clock className="size-3.5" />
              {formattedTime}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Droplets className="size-3.5" />
              Claim 500 USDC →
            </span>
          )}
        </button>
        {cooldownActive && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-[var(--brutal-ink)] opacity-30 transition-all duration-1000"
            style={{ width: `${(cooldownSec / FAUCET_COOLDOWN_S) * 100}%` }}
          />
        )}
      </div>
      {cooldownActive && (
        <p className="mt-3 text-center text-[10px] font-semibold text-[var(--brutal-muted)]">
          Next claim available in{" "}
          <strong className="text-[var(--brutal-ink)]">{formattedTime}</strong>.
          Come back after cooldown to claim more USDC.
        </p>
      )}
    </div>
  );
}
