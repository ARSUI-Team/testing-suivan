"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import ConnectSuiWallet from "@/components/ConnectSuiWallet";
import { useLanguage } from "@/context/LanguageContext";
import { Layers } from "lucide-react";
import {
  useAllPoolsWithInfo,
  useJoinPool,
  useCreatePool,
  useUserUSDCcoins,
  useUSDCBalance,
  useLinkPoolMetadata,
  useClaimUSDC,
  FormattedPool,
  type TransactionResult,
} from "@/hooks/useSuiContracts";
import { useFaucetId, IS_MAINNET } from "@/config/sui";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import { CrossChainBridgeModal } from "@/components/CrossChainBridgeModal";
import { PoolName } from "@/components/PoolName";
import { useBridgeToDeposit } from "@/hooks/useBridgeToDeposit";
import { publishPoolMetadata } from "@/hooks/usePoolWalrusMetadata";
import PoolCardSkeleton from "@/components/PoolCardSkeleton";
import { DEFAULT_COLLATERAL_MULTIPLIER, getRequiredCollateralAmount } from "@/lib/poolMath";
import { getPoolStatusLabel, type PoolLifecycleStatus } from "@/lib/poolLifecycle";

type PoolStatus = "all" | PoolLifecycleStatus;

function findObjectChange(response: TransactionResult, objectType: string) {
  return response.objectChanges?.find((change) =>
    "objectId" in change && !!change.objectId && change.objectType?.includes(objectType)
  );
}

async function waitForDigest(client: ReturnType<typeof useSuiClient>, digest: string) {
  try {
    await client.waitForTransaction({ digest, timeout: 20_000 });
  } catch {
    // The UI can still refresh optimistically if the indexer is slow.
  }
}

export default function PoolsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const isConnected = !!account;
  const [filter, setFilter] = useState<PoolStatus>("all");
  const [selectedPool, setSelectedPool] = useState<FormattedPool | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCoinId, setJoinCoinId] = useState("");
  const [publishingMetadata, setPublishingMetadata] = useState(false);
  const [createForm, setCreateForm] = useState({
    depositAmount: 25,
    maxParticipants: 8,
    cycleDuration: 30,
    cycleUnit: "days" as "days" | "minutes",
    usdcCoinId: "",
    poolName: "",
    poolDescription: "",
  });
  const {
    showBridgeModal,
    openBridgeModal,
    closeBridgeModal,
    handleBridgeComplete,
  } = useBridgeToDeposit();
  const { t } = useLanguage();

  const { pools, isLoading: poolsLoading, refetch: refetchPools } = useAllPoolsWithInfo();

  const { coins: usdcCoins } = useUserUSDCcoins(account?.address);
  const { balance: usdcBalance } = useUSDCBalance(account?.address);

  const { joinPool, isPending: joining } = useJoinPool();
  const { createPool, isPending: creating } = useCreatePool();
  const { linkMetadata, isPending: linkingMeta } = useLinkPoolMetadata();
  const { claimUSDC, isPending: claimPending } = useClaimUSDC();
  const faucetId = useFaucetId();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  useEffect(() => {
    if (showCreateModal || selectedPool) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCreateModal, selectedPool]);

  const filteredPools = pools
    ? filter === "all" ? pools : pools.filter((p) => p.status === filter)
    : [];

  const getStatusText = (status: string) => {
    return status === "all" ? "All" : getPoolStatusLabel(status as PoolLifecycleStatus);
  };

  const gsapRef = useGsapEntrance([pools]);

  const COLLATERAL_MULTIPLIER = DEFAULT_COLLATERAL_MULTIPLIER;

  const resetCreateForm = () => {
    setCreateForm({
      depositAmount: 25,
      maxParticipants: 8,
      cycleDuration: 30,
      cycleUnit: "days",
      usdcCoinId: usdcCoins[0]?.coinObjectId || "",
      poolName: "",
      poolDescription: "",
    });
  };

  const handleJoinPool = () => {
    if (!selectedPool) return;
    const coinId = joinCoinId || usdcCoins[0]?.coinObjectId || "";
    if (!coinId) {
      errorToast("Validation", "No USDC coin available. Get USDC from Faucet first.");
      return;
    }
    const collateralAmt = getRequiredCollateralAmount(
      selectedPool.depositAmount,
      selectedPool.maxParticipants,
      COLLATERAL_MULTIPLIER,
    );
    joinPool(selectedPool.address, collateralAmt, coinId, (response) => {
      setSelectedPool(null);
      setJoinCoinId("");
      refetchPools();
      const txMsg = response.digest ? `\nTx: ${response.digest.slice(0, 10)}…${response.digest.slice(-4)}` : "";
      successToast("Joined Pool", `You are now a participant. Your collateral is locked.${txMsg}`);
    });
  };

  const handleCreatePool = async () => {
    if (!createForm.usdcCoinId) {
      errorToast("Validation", "Please select a USDC coin first");
      return;
    }

    let blobId: string | null = null;
    if (createForm.poolName.trim()) {
      setPublishingMetadata(true);
      blobId = await publishPoolMetadata(
        createForm.poolName.trim(),
        createForm.poolDescription.trim(),
        account?.address || "",
        "",
      );
      setPublishingMetadata(false);

      if (!blobId) {
        errorToast("Metadata Publish Failed", "Pool was not created because the custom name could not be uploaded.");
        return;
      }
    }
    createPool(
      createForm.depositAmount,
      createForm.maxParticipants,
      createForm.cycleUnit === "minutes" ? createForm.cycleDuration * 60 * 1000 : createForm.cycleDuration * 24 * 60 * 60 * 1000,
      createForm.usdcCoinId,
      async (response) => {
        const createTxMsg = response.digest ? `\nTx: ${response.digest.slice(0, 10)}...${response.digest.slice(-4)}` : "";

        if (!blobId) {
          await waitForDigest(suiClient, response.digest);
          setShowCreateModal(false);
          resetCreateForm();
          refetchPools();
          successToast("Pool Created", `Your ROSCA pool is now live.${createTxMsg}`);
          return;
        }

        const poolChange = findObjectChange(response, "::ArisanPool");
        const capChange = findObjectChange(response, "::PoolAdminCap");
        if (!poolChange?.objectId || !capChange?.objectId) {
          await waitForDigest(suiClient, response.digest);
          setShowCreateModal(false);
          resetCreateForm();
          refetchPools();
          errorToast("Pool Created Without Name", `The pool was created, but its metadata could not be linked.${createTxMsg}`);
          return;
        }

        linkMetadata(
          poolChange.objectId,
          blobId,
          capChange.objectId,
          async (linkResponse) => {
            await waitForDigest(suiClient, linkResponse.digest);
            setShowCreateModal(false);
            resetCreateForm();
            refetchPools();
            successToast("Pool Created", `Your ROSCA pool is now live and the custom name has been applied.${createTxMsg}`);
          },
          (linkError) => {
            setShowCreateModal(false);
            resetCreateForm();
            refetchPools();
            errorToast(
              "Pool Created Without Name",
              linkError?.message || `The pool was created, but the custom name could not be linked.${createTxMsg}`,
            );
          }
        );
      },
      (createError) => {
        errorToast("Create Pool Failed", createError?.message || "Transaction failed");
      },
    );
  };

  return (
    <main className="min-h-screen bg-grid-brutal">
      <Header />

      <section ref={gsapRef} className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#f8672d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#0a0a0a]">
            <Layers className="size-4" />
            POOL EXPLORER
          </p>
          <h1
            className="gsap-up mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}
          >
            {t("pools.title")}
          </h1>
          <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#333333]">
            {t("pools.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Stats */}
          {pools && pools.length > 0 && (
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="relative border-[3px] border-[#0a0a0a] bg-grid-brutal p-4 shadow-[10px_10px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.06 }} />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>{t("pools.totalPools")}</p>
                  <p className="mt-2 text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{pools.length}</p>
                  <div className="mt-3 pt-2 border-t-[2px] border-[#0a0a0a] flex items-center justify-between">
                    <div className="w-6 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 6px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>live</span>
                  </div>
                </div>
              </div>
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4 shadow-[10px_10px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.06 }} />
                <div className="absolute pointer-events-none" style={{ top: "-10%", right: "-10%", width: "40%", height: "40%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 1px, transparent 1px 6px)", opacity: 0.08 }} />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>{t("pools.open")}</p>
                  <p className="mt-2 text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{pools.filter((p) => p.status === "open").length}</p>
                  <div className="mt-3 pt-2 border-t-[2px] border-[#0a0a0a] flex items-center justify-between">
                    <div className="w-6 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 6px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>ready</span>
                  </div>
                </div>
              </div>
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4 shadow-[10px_10px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.06 }} />
                <div className="absolute pointer-events-none" style={{ bottom: "-10%", left: "-10%", width: "35%", height: "35%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 1px, transparent 1px 6px)", opacity: 0.08 }} />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>{t("pools.active")}</p>
                  <p className="mt-2 text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{pools.filter((p) => ["ready", "active", "action_required"].includes(p.status)).length}</p>
                  <div className="mt-3 pt-2 border-t-[2px] border-[#0a0a0a] flex items-center justify-between">
                    <div className="w-6 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 6px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>running</span>
                  </div>
                </div>
              </div>
              <div className="relative border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4 shadow-[10px_10px_0_#0a0a0a] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.06 }} />
                <div className="absolute pointer-events-none" style={{ top: "-10%", right: "-15%", width: "50%", height: "50%", background: "repeating-linear-gradient(45deg, #0a0a0a 0 1px, transparent 1px 6px)", opacity: 0.06 }} />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>{t("pools.usdc")}</p>
                  <p className="mt-2 text-3xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{isConnected ? `${usdcBalance.toLocaleString()} USDC` : "---"}</p>
                  <div className="mt-3 pt-2 border-t-[2px] border-[#0a0a0a] flex items-center justify-between">
                    <div className="w-6 h-2" style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 1px, transparent 1px, transparent 3px, #0a0a0a 3px, #0a0a0a 4px, transparent 4px, transparent 6px)" }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={{ fontFamily: "'Courier New', monospace" }}>balance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Faucet */}
          {isConnected && (
            <div className="gsap-up mb-4">
              <Link href="/faucet" className="protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-4 py-2 text-xs font-black shadow-[6px_6px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                Get Test USDC →
              </Link>
            </div>
          )}

          {/* Filters & Create */}
          <div className="gsap-up mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-grid-brutal p-1.5 shadow-[4px_4px_0_#0a0a0a]">
              {(["all", "open", "ready", "active", "action_required", "completed"] as PoolStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`protocol-font whitespace-nowrap px-4 py-2 text-sm font-black tracking-[0.05em] transition-all ${
                    filter === status
                      ? status === "all" ? "bg-[#0a0a0a] text-[#38bdf8]" : "bg-[#f8672d] text-[#0a0a0a]"
                      : "text-[#333333] hover:bg-[#e8e1d9] hover:text-[#0a0a0a]"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {isConnected ? (
              <button
                onClick={() => {
                  if (usdcCoins.length > 0 && !createForm.usdcCoinId) {
                    setCreateForm(f => ({ ...f, usdcCoinId: usdcCoins[0].coinObjectId }));
                  }
                  setShowCreateModal(true);
                }}
                className="protocol-font inline-flex h-14 items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-8 text-base font-black text-[#0a0a0a] shadow-[10px_10px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                + {t("pools.create")}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "#333333" }}>{t("pools.connectWallet")}</span>
                <ConnectSuiWallet variant="header" scrolled={true} />
              </div>
            )}
          </div>

          {/* Loading */}
          {poolsLoading && (
            <div className="gsap-up grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PoolCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Pool Grid */}
          {!poolsLoading && (
            <div className="gsap-up grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPools.map((pool) => {
                const init = (pool.name || "?")[0].toUpperCase();
                const statusBg =
                  pool.status === "active"
                    ? "#00e060"
                    : pool.status === "open"
                      ? "#f6c85f"
                      : pool.status === "ready"
                        ? "#5ec8ff"
                        : pool.status === "action_required"
                          ? "#ff7a7a"
                          : "#a8a49a";
                const memberRatio = pool.currentParticipants / pool.maxParticipants;
                return (
                  <div
                    key={pool.address}
                    className="card-profile"
                    style={{
                      background: "#f5f5f0",
                      border: "5px solid #0a0a0a",
                      boxShadow: "8px 8px 0 #0a0a0a",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "10px 10px 0 #0a0a0a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "8px 8px 0 #0a0a0a"; }}
                  >
                    {/* Photo header */}
                    <div
                      className="prof-photo"
                      style={{
                        height: 150,
                        background: "#38bdf8",
                        borderBottom: "5px solid #0a0a0a",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "flex-end",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)",
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        className="prof-photo-num"
                        style={{
                          fontFamily: "'Bebas Neue', system-ui, sans-serif",
                          fontSize: "6rem",
                          lineHeight: 0.85,
                          color: "rgba(0,0,0,0.08)",
                          position: "absolute",
                          right: -8,
                          bottom: -10,
                          letterSpacing: "-0.02em",
                          pointerEvents: "none",
                        }}
                      >
                        {Math.floor(pool.apy)}
                      </div>
                      <div
                        className="prof-avatar"
                        style={{
                          width: 64,
                          height: 64,
                          background: "#0a0a0a",
                          border: "5px solid #0a0a0a",
                          borderBottom: "none",
                          borderLeft: "none",
                          marginLeft: 18,
                          position: "relative",
                          zIndex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Bebas Neue', system-ui, sans-serif",
                          fontSize: "1.8rem",
                          color: "#38bdf8",
                          flexShrink: 0,
                        }}
                      >
                        {init}
                      </div>
                      <div
                        className="prof-status-badge"
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 2,
                          background: statusBg,
                          border: "3px solid #0a0a0a",
                          boxShadow: "3px 3px 0 #0a0a0a",
                          fontSize: "0.5rem",
                          fontWeight: 800,
                          letterSpacing: "0.18em",
                          padding: "3px 8px",
                          textTransform: "uppercase",
                          color: "#0a0a0a",
                        }}
                      >
                        {getStatusText(pool.status)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="prof-body" style={{ padding: "14px 16px 0", flex: 1 }}>
                      <p
                        className="prof-handle"
                        style={{
                          fontSize: "0.5rem",
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          color: "#333333",
                          textTransform: "uppercase",
                          marginBottom: 1,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                      </p>
                      <h3
                        className="prof-name"
                        style={{
                          fontFamily: "'Bebas Neue', system-ui, sans-serif",
                          fontSize: "2rem",
                          lineHeight: 0.9,
                          color: "#0a0a0a",
                          letterSpacing: "-0.01em",
                          marginBottom: 8,
                        }}
                      >
                        <PoolName blobId={pool.walrusMetadataBlobId} fallback={pool.name} />
                      </h3>
                      <p
                        className="prof-bio"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 500,
                          color: "#0a0a0a",
                          borderLeft: "4px solid #e8180a",
                          paddingLeft: 8,
                          lineHeight: 1.55,
                          marginBottom: 10,
                        }}
                      >
                        {pool.depositAmount} USDC deposit &middot; {pool.cycleDurationMs && pool.cycleDurationMs < 86_400_000 ? Math.round(pool.cycleDurationMs / 60_000) + "m" : pool.cycleDuration + "d"} cycles &middot; {pool.apy}% APY
                        {pool.walrusMetadataBlobId && (
                          <span style={{ color: "#14b8a6", marginLeft: 6 }}>+Walrus</span>
                        )}
                      </p>
                    </div>

                    {/* Stats */}
                    <div
                      className="prof-stats"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        borderTop: "3px solid #0a0a0a",
                        flexShrink: 0,
                      }}
                    >
                      {[
                        { value: `${pool.depositAmount}`, label: "Deposit", sub: "USDC" },
                        { value: `${pool.currentParticipants}/${pool.maxParticipants}`, label: "Members", sub: `${Math.round(memberRatio * 100)}%` },
                        { value: pool.cycleDurationMs && pool.cycleDurationMs < 86_400_000 ? `${Math.round(pool.cycleDurationMs / 60_000)}m` : `${pool.cycleDuration}d`, label: "Cycle", sub: `$${pool.totalFunds.toFixed(0)}` },
                      ].map((stat, si) => (
                        <div
                          key={stat.label}
                          className="pstat"
                          style={{
                            padding: "10px 8px",
                            borderRight: si < 2 ? "3px solid #0a0a0a" : "none",
                            textAlign: "center",
                          }}
                        >
                          <span
                            className="psv"
                            style={{
                              fontFamily: "'Bebas Neue', system-ui, sans-serif",
                              fontSize: "1.5rem",
                              lineHeight: 1,
                              color: "#0a0a0a",
                              display: "block",
                            }}
                          >
                            {stat.value}
                          </span>
                          <span
                            className="psl"
                            style={{
                              fontSize: "0.45rem",
                              fontWeight: 700,
                              letterSpacing: "0.15em",
                              color: "#333333",
                              textTransform: "uppercase",
                              display: "block",
                              marginTop: 1,
                            }}
                          >
                            {stat.label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.4rem",
                              fontWeight: 600,
                              color: "#333333",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {stat.sub}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div style={{ flexShrink: 0 }}>
                      <a
                        href={`/pools/${pool.address}`}
                        className="prof-btn"
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "11px",
                          background: "#38bdf8",
                          color: "#0a0a0a",
                          border: "none",
                          borderTop: "3px solid #0a0a0a",
                          fontFamily: "'Bebas Neue', system-ui, sans-serif",
                          fontSize: "1rem",
                          letterSpacing: "0.2em",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#38bdf8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#38bdf8"; e.currentTarget.style.color = "#0a0a0a"; }}
                      >
                        {t("pools.viewDetails")}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!poolsLoading && filteredPools.length === 0 && (
            <div className="border-[4px] border-[#0a0a0a] bg-grid-brutal py-16 text-center shadow-[6px_6px_0_#0a0a0a]">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center border-[3px] border-[#0a0a0a] bg-[var(--accent-soft)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{t("pools.emptyTitle")}</h3>
              <p className="font-semibold" style={{ color: "#333333" }}>
                {pools && pools.length === 0
                  ? t("pools.emptyDesc")
                  : t("pools.emptyFilter", { filter })}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Join Pool Modal */}
      {selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedPool(null)} />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto border-[4px] border-[#0a0a0a] bg-grid-brutal p-6 shadow-[8px_8px_0_#0a0a0a]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#e8180a" }}>join_cycle</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{t("pools.joinTitle", { name: selectedPool.name })}</h3>
              </div>
              <button onClick={() => setSelectedPool(null)} className="grid size-10 place-items-center border-[3px] border-[#0a0a0a] bg-[#f8672d] shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="border-[3px] border-[#0a0a0a] bg-grid-brutal p-4 shadow-[3px_3px_0_#0a0a0a]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "#333333" }}>{t("pools.deposit")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{selectedPool.depositAmount} USDC</p>
              </div>

              <div className="border-[3px] border-[#0a0a0a] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "#333333" }}>{t("pools.collateral")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>
                  {Math.ceil(selectedPool.depositAmount * 125 / 100)} USDC
                </p>
                <p className="mt-1 text-xs font-semibold" style={{ color: "#333333" }}>{t("pools.collateralDesc")}</p>
              </div>

              <div className="border-[3px] border-[#0a0a0a] bg-[var(--accent-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "#333333" }}>{t("pools.estimatedApy")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{selectedPool.apy}%</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="border-[3px] border-[#0a0a0a] bg-[var(--success-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                  <p className="protocol-font text-xs font-black uppercase tracking-[0.15em]" style={{ color: "#333333" }}>USDC Balance</p>
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>
                    {usdcBalance.toFixed(2)} USDC
                  </p>
                </div>
              ) : (
                <div className="border-[3px] border-[#0a0a0a] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                  <p className="protocol-font text-xs font-black uppercase tracking-[0.15em]" style={{ color: "#333333" }}>Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: "#333333" }}>Get free test USDC from the Faucet page before joining.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-2 text-xs font-black shadow-[6px_6px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  >
                    Go to Faucet →
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={openBridgeModal}
              className="w-full border-[3px] border-[#0a0a0a] bg-[var(--purple)] py-3 text-sm font-black tracking-[0.1em] text-[#ffffff] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Bridge from other chains
              </span>
            </button>

            <button
              onClick={handleJoinPool}
              disabled={joining}
              className={`w-full border-[3px] border-[#0a0a0a] py-3 text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_#0a0a0a] mt-3 ${
                joining
                  ? "cursor-not-allowed bg-[#e8e1d9] text-[#333333] opacity-50"
                  : "bg-[#f8672d] text-[#0a0a0a] hover:-translate-x-0.5 hover:-translate-y-0.5"
              }`}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />
                  Joining...
                </span>
              ) : t("pools.join")}
            </button>

            <p className="mt-4 text-center text-xs font-semibold" style={{ color: "#333333" }}>
              {t("pools.agree", { count: selectedPool.maxParticipants })}
            </p>
          </div>
        </div>
      )}

      {/* Cross-Chain Bridge Modal */}
      <CrossChainBridgeModal
        isOpen={showBridgeModal}
        onClose={closeBridgeModal}
        onBridgeComplete={handleBridgeComplete}
      />

      {/* Create Pool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto border-[4px] border-[#0a0a0a] bg-grid-brutal p-6 shadow-[8px_8px_0_#0a0a0a]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-[#f8672d]">create_pool</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "#0a0a0a" }}>{t("pools.createTitle")}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="grid size-11 place-items-center border-[3px] border-[#0a0a0a] bg-[#f8672d] shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                  Pool Name <span className="text-[#e8180a]">*</span>
                </label>
                <input
                  type="text" maxLength={64}
                  value={createForm.poolName}
                  onChange={(e) => setCreateForm({ ...createForm, poolName: e.target.value })}
                  placeholder="e.g. Family Arisan 2026"
                  className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-[#ffffff] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none"
                />
              </div>
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">Description <span className="text-[#a8a49a]">(optional)</span></label>
                <textarea maxLength={500} value={createForm.poolDescription} onChange={(e) => setCreateForm({ ...createForm, poolDescription: e.target.value })} placeholder="Brief description of your pool..." rows={2} className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-[#ffffff] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none resize-none" />
              </div>
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">{t("pools.deposit")} (USDC)</label>
                <input type="number" min="1" value={createForm.depositAmount} onChange={(e) => setCreateForm({ ...createForm, depositAmount: Number(e.target.value) })} className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-[#ffffff] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none" />
              </div>
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">Max Participants (2-50)</label>
                <input type="number" min="2" max="50" value={createForm.maxParticipants} onChange={(e) => setCreateForm({ ...createForm, maxParticipants: Number(e.target.value) })} className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-[#ffffff] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none" />
              </div>
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">Cycle Duration</label>
                <div className="flex gap-2">
                  <input type="number" min={IS_MAINNET ? 30 : 1} value={createForm.cycleDuration} onChange={(e) => setCreateForm({ ...createForm, cycleDuration: Number(e.target.value) })} className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-[#ffffff] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none" />
                  <select value={createForm.cycleUnit} onChange={(e) => setCreateForm({ ...createForm, cycleUnit: e.target.value as "days" | "minutes" })} className="min-h-[44px] border-[3px] border-[#0a0a0a] bg-[#ffffff] px-3 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none">
                    {!IS_MAINNET && <option value="minutes">Minutes</option>}
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              {usdcBalance > 0 ? (
                <div className="border-[3px] border-[#0a0a0a] bg-[var(--success-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                  <p className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#333333]">USDC Balance</p>
                  <p className="text-2xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{usdcBalance.toFixed(2)} USDC</p>
                </div>
              ) : (
                <div className="border-[3px] border-[#0a0a0a] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_#0a0a0a]">
                  <p className="protocol-font text-xs font-black uppercase tracking-[0.15em] text-[#333333]">No USDC Balance</p>
                  <p className="mt-1 text-sm font-semibold text-[#333333]">Get free test USDC first to create a pool.</p>
                  <Link href="/faucet" className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-2 text-xs font-black shadow-[6px_6px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5">Get 500 USDC from Faucet →</Link>
                </div>
              )}

              <div className="space-y-2 border-[3px] border-[#0a0a0a] bg-grid-brutal p-4 shadow-[3px_3px_0_#0a0a0a]">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#333333]">Total Pool per Cycle</span>
                  <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{createForm.depositAmount * createForm.maxParticipants} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#333333]">Total Duration</span>
                  <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {createForm.cycleUnit === "minutes" ? (createForm.cycleDuration * createForm.maxParticipants < 60 ? `${createForm.cycleDuration * createForm.maxParticipants}m` : `${Math.round(createForm.cycleDuration * createForm.maxParticipants / 60)}h`) : `${createForm.cycleDuration * createForm.maxParticipants} days`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#333333]">{t("pools.requiredCollateral")}</span>
                  <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{getRequiredCollateralAmount(createForm.depositAmount, createForm.maxParticipants, COLLATERAL_MULTIPLIER)} USDC</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreatePool}
              disabled={creating || linkingMeta || publishingMetadata || createForm.poolName.trim().length === 0}
              className={`w-full border-[3px] border-[#0a0a0a] py-3 text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_#0a0a0a] ${creating || linkingMeta || publishingMetadata || createForm.poolName.trim().length === 0 ? "cursor-not-allowed bg-[#e8e1d9] text-[#333333] opacity-50" : "bg-[#f8672d] text-[#0a0a0a] hover:-translate-x-0.5 hover:-translate-y-0.5"}`}
            >
              {publishingMetadata ? (<span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />Publishing metadata...</span>)
               : creating ? (<span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />Creating pool...</span>)
               : linkingMeta ? (<span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />Linking metadata...</span>)
               : "Create Pool"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

function FaucetButton({ refetchPools }: { userAddress?: string; refetchPools: () => void }) {
  const { claimUSDC, isPending } = useClaimUSDC();
  const faucetId = useFaucetId();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const [success, setSuccess] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  const COOLDOWN_MS = 86_400_000;

  const checkCooldown = (): boolean => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem("suivan_faucet_claim");
    if (!raw) return false;
    const last = Number(raw);
    const elapsed = Date.now() - last;
    if (elapsed < COOLDOWN_MS) {
      setCooldownSec(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => setCooldownSec((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  const cooldownActive = cooldownSec > 0;

  const handleFaucet = () => {
    if (!faucetId) {
      errorToast("Faucet not available");
      return;
    }
    if (checkCooldown()) {
      errorToast("Faucet cooldown active — try again later");
      return;
    }
    claimUSDC(faucetId);
    setSuccess(true);
    setTimeout(() => {
      refetchPools();
      setSuccess(false);
    }, 2000);
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
  };

  return (
    <button
      onClick={handleFaucet}
      disabled={!faucetId || isPending || success || cooldownActive}
      className={`protocol-font inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] px-4 py-2 text-xs font-black shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 ${
        success ? "bg-[var(--success-soft)]" : "bg-[var(--warn-soft)]"
      }`}
    >
      {isPending ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-transparent" />
          Minting...
        </>
      ) : success ? (
        "500 USDC Minted!"
      ) : cooldownActive ? (
        `Cooldown ${fmt(cooldownSec)}`
      ) : (
        "Get Test USDC"
      )}
    </button>
  );
}
