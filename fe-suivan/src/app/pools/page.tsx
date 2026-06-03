"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCurrentAccount } from "@mysten/dapp-kit";
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
  FormattedPool,
} from "@/hooks/useSuiContracts";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import { CrossChainBridgeModal } from "@/components/CrossChainBridgeModal";
import { PoolName } from "@/components/PoolName";
import { useBridgeToDeposit } from "@/hooks/useBridgeToDeposit";
import { publishPoolMetadata } from "@/hooks/usePoolWalrusMetadata";
import PoolCardSkeleton from "@/components/PoolCardSkeleton";

type PoolStatus = "all" | "open" | "active" | "completed";

export default function PoolsPage() {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [filter, setFilter] = useState<PoolStatus>("all");
  const [selectedPool, setSelectedPool] = useState<FormattedPool | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCoinId, setJoinCoinId] = useState("");
  const [createForm, setCreateForm] = useState({
    depositAmount: 25,
    maxParticipants: 8,
    cycleDuration: 30,
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

  const { joinPool, isPending: joining, isSuccess: joinSuccess } = useJoinPool();
  const { createPool, isPending: creating, isSuccess: createSuccess, txResponse: createTxResponse, hash: createHash } = useCreatePool();
  const { linkMetadata, isPending: linkingMeta, isSuccess: linkSuccess } = useLinkPoolMetadata();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const [pendingBlobId, setPendingBlobId] = useState<string | null>(null);
  const [creatingWithMeta, setCreatingWithMeta] = useState(false);

  useEffect(() => {
    if (joinSuccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPool(null);
      setJoinCoinId("");
      refetchPools();
      successToast("Joined Pool", "You are now a participant. Your collateral is locked.");
    }
  }, [joinSuccess, refetchPools, successToast]);
  useEffect(() => {
    if (createSuccess && createTxResponse) {
      setShowCreateModal(false);
      refetchPools();

      if (pendingBlobId) {
        const changes = createTxResponse.objectChanges || [];
        const poolChange = changes.find((c: any) =>
          c.type === "created" && c.objectType?.includes("::ArisanPool")
        );
        const capChange = changes.find((c: any) =>
          c.type === "created" && c.objectType?.includes("::PoolAdminCap")
        );
        if (poolChange?.objectId && capChange?.objectId) {
          linkMetadata(poolChange.objectId, pendingBlobId, capChange.objectId);
        }
      }
      setPendingBlobId(null);
      setCreatingWithMeta(false);
      const poolTxMsg = createHash ? `\nTx: ${createHash.slice(0, 10)}…${createHash.slice(-4)}` : "";
      successToast("Pool Created", `Your ROSCA pool is now live.${poolTxMsg}`);
    }
  }, [createSuccess, createTxResponse, createHash, pendingBlobId, linkMetadata, refetchPools, successToast]);

  // Auto-populate coin when modals open
  useEffect(() => {
    if (selectedPool && usdcCoins.length > 0 && !joinCoinId) {
      setJoinCoinId(usdcCoins[0].coinObjectId);
    }
  }, [selectedPool, usdcCoins, joinCoinId]);

  const filteredPools = pools
    ? filter === "all" ? pools : pools.filter((p) => p.status === filter)
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-[var(--success-soft)]";
      case "active": return "bg-[var(--accent-soft)]";
      case "completed": return "bg-[var(--brutal-surface)]";
      default: return "bg-[var(--brutal-surface)]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Open";
      case "active": return "Active";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const gsapRef = useGsapEntrance([pools]);

  const COLLATERAL_MULTIPLIER = 125;

  const handleJoinPool = () => {
    if (!selectedPool) return;
    if (!joinCoinId) {
      errorToast("Validation", "No USDC coin available. Get USDC from Faucet first.");
      return;
    }
    const collateralAmt = Math.ceil(selectedPool.depositAmount * COLLATERAL_MULTIPLIER / 100);
    joinPool(selectedPool.address, collateralAmt, joinCoinId);
  };

  const handleCreatePool = async () => {
    if (!createForm.usdcCoinId) {
      errorToast("Validation", "Please select a USDC coin first");
      setCreatingWithMeta(false);
      return;
    }

    setCreatingWithMeta(true);

    // 1. Publish metadata to Walrus if name is provided
    let blobId: string | null = null;
    if (createForm.poolName) {
      blobId = await publishPoolMetadata(
        createForm.poolName,
        createForm.poolDescription,
        account?.address || "",
        "",
      );
    }
    setPendingBlobId(blobId);

    // 2. Create pool on-chain
    createPool(
      createForm.depositAmount,
      createForm.maxParticipants,
      createForm.cycleDuration,
      createForm.usdcCoinId,
    );
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--brutal-bg)" }}>
      <Header />

      <section ref={gsapRef} className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_var(--brutal-ink)]">
            <Layers className="size-4" />
            pool_explorer
          </p>
          <h1
            className="gsap-up mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            {t("pools.title")}
          </h1>
          <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {t("pools.subtitle")}
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Stats */}
          {pools && pools.length > 0 && (
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[var(--brutal-muted)]">{t("pools.totalPools")}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{pools.length}</p>
              </div>
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[var(--brutal-muted)]">{t("pools.open")}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                  {pools.filter((p) => p.status === "open").length}
                </p>
              </div>
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[var(--brutal-muted)]">{t("pools.active")}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                  {pools.filter((p) => p.status === "active").length}
                </p>
              </div>
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
                <p className="protocol-font text-xs font-black tracking-[0.1em] text-[var(--brutal-muted)]">{t("pools.usdc")}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                  {isConnected ? `${usdcBalance.toLocaleString()} USDC` : "---"}
                </p>
              </div>
            </div>
          )}

          {/* Faucet */}
          {isConnected && (
            <div className="gsap-up mb-4">
              <FaucetButton userAddress={account!.address} refetchPools={refetchPools} />
            </div>
          )}

          {/* Filters & Create */}
          <div className="gsap-up mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-1.5 shadow-[4px_4px_0_var(--brutal-ink)]">
              {(["all", "open", "active", "completed"] as PoolStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`protocol-font whitespace-nowrap px-4 py-2 text-sm font-black tracking-[0.05em] transition-all ${
                    filter === status
                      ? status === "all" ? "bg-[var(--brutal-ink)] text-[var(--brutal-accent)]" : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)]"
                      : "text-[var(--brutal-muted)] hover:bg-[var(--brutal-surface)] hover:text-[var(--brutal-ink)]"
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
                className="brutal-btn"
              >
                + {t("pools.create")}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "var(--brutal-muted)" }}>{t("pools.connectWallet")}</span>
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
            <div className="gsap-up grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredPools.map((pool) => (
                <div
                  key={pool.address}
                  className="border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] shadow-[6px_6px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--brutal-ink)]"
                >
                  <div className="border-b-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--brutal-ink)" }}>ROSCA Pool</p>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}><PoolName blobId={pool.walrusMetadataBlobId} fallback={pool.name} /></h3>
                        <p className="protocol-font mt-1 text-[10px] font-bold" style={{ color: "var(--brutal-ink)" }}>
                          {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                        </p>
                      </div>
                      <span className={`protocol-font border-[3px] border-[var(--brutal-ink)] px-3 py-1 text-[10px] font-black shadow-[3px_3px_0_var(--brutal-ink)] ${getStatusColor(pool.status)}`}>
                        {getStatusText(pool.status)}
                      </span>
                    </div>
                    <div className="flex w-fit items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] px-3 py-2 shadow-[3px_3px_0_var(--brutal-ink)]">
                      <span className="protocol-font text-xs font-black tracking-[0.05em]" style={{ color: "var(--brutal-ink)" }}>{pool.apy}% APY</span>
                      <span className="protocol-font text-[10px] font-black tracking-[0.12em]" style={{ color: "var(--brutal-muted)" }}>Yield signal</span>
                    </div>
                    {pool.walrusMetadataBlobId && (
                      <div className="mt-2 flex w-fit items-center gap-1.5 border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] px-2 py-1 shadow-[2px_2px_0_var(--brutal-ink)]">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="var(--brutal-ink)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="protocol-font text-[9px] font-black tracking-[0.12em]" style={{ color: "var(--brutal-ink)" }}>Walrus</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="protocol-font mb-1 text-xs font-black tracking-[0.1em]" style={{ color: "var(--brutal-muted)" }}>{t("pools.deposit")}</p>
                        <p className="text-lg font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{pool.depositAmount} USDC</p>
                      </div>
                      <div>
                        <p className="protocol-font mb-1 text-xs font-black tracking-[0.1em]" style={{ color: "var(--brutal-muted)" }}>CYCLE</p>
                        <p className="text-lg font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{pool.cycleDuration} days</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="protocol-font text-xs font-black tracking-[0.1em]" style={{ color: "var(--brutal-muted)" }}>Participants</span>
                        <span className="text-sm font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                          {pool.currentParticipants}/{pool.maxParticipants}
                        </span>
                      </div>
                      <div className="h-3 w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)]">
                        <div className="h-full bg-[var(--brutal-accent)] transition-all duration-500" style={{ width: `${(pool.currentParticipants / pool.maxParticipants) * 100}%` }} />
                      </div>
                    </div>

                    <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] p-3 shadow-[3px_3px_0_var(--brutal-ink)]">
                      <div className="flex items-center justify-between">
                        <span className="protocol-font text-xs font-black tracking-[0.1em]" style={{ color: "var(--brutal-muted)" }}>Total Pool Funds</span>
                        <span className="text-lg font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                          ${pool.totalFunds.toFixed(2)}
                        </span>
                      </div>
                      {pool.totalFunds === 0 && (
                        <p className="protocol-font mt-1 text-[9px] font-semibold" style={{ color: "var(--brutal-muted)" }}>
                          Testnet — no deposits yet
                        </p>
                      )}
                      <p className="protocol-font mt-1 text-[8px]" style={{ color: "var(--brutal-muted)" }}>
                        debug: totalFunds={pool.totalFunds} collateralBalance={(pool as any).collateralBalance}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {pool.status === "open" && pool.currentParticipants < pool.maxParticipants && (
                        <button
                          onClick={() => setSelectedPool(pool)}
                          disabled={!isConnected}
                          className={`w-full border-[3px] border-[var(--brutal-ink)] py-3 text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_var(--brutal-ink)] ${
                            isConnected
                              ? "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                              : "cursor-not-allowed bg-[var(--brutal-surface)] text-[var(--brutal-muted)] opacity-50"
                          }`}
                        >
                          {isConnected ? t("pools.join") : "Connect Wallet to Join"}
                        </button>
                      )}
                      <a
                        href={`/pools/${pool.address}`}
                        className={`block w-full border-[3px] border-[var(--brutal-ink)] py-3 text-center text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_var(--brutal-ink)] ${
                          pool.status === "open"
                            ? "bg-[var(--brutal-bg)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-surface)]"
                            : pool.status === "active"
                            ? "bg-[var(--accent-soft)] text-[var(--brutal-ink)] hover:bg-[var(--brutal-accent)] hover:text-[var(--brutal-card)]"
                            : "bg-[var(--brutal-surface)] text-[var(--brutal-muted)] hover:bg-[var(--accent-soft)]"
                        }`}
                      >
                        {t("pools.viewDetails")}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!poolsLoading && filteredPools.length === 0 && (
            <div className="border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] py-16 text-center shadow-[6px_6px_0_var(--brutal-ink)]">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="var(--brutal-ink)">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-black tracking-[-0.02em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{t("pools.emptyTitle")}</h3>
              <p className="font-semibold" style={{ color: "var(--brutal-muted)" }}>
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
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-6 shadow-[8px_8px_0_var(--brutal-ink)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#e8180a" }}>join_cycle</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{t("pools.joinTitle", { name: selectedPool.name })}</h3>
              </div>
              <button onClick={() => setSelectedPool(null)} className="grid size-10 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--brutal-ink)">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>{t("pools.deposit")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{selectedPool.depositAmount} USDC</p>
              </div>

              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>{t("pools.collateral")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                  {Math.ceil(selectedPool.depositAmount * 125 / 100)} USDC
                </p>
                <p className="mt-1 text-xs font-semibold" style={{ color: "var(--brutal-muted)" }}>{t("pools.collateralDesc")}</p>
              </div>

              <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--accent-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>{t("pools.estimatedApy")}</p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{selectedPool.apy}%</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--brutal-muted)" }}>USDC Balance</p>
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                    {usdcBalance.toFixed(2)} USDC
                  </p>
                </div>
              ) : (
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--brutal-muted)" }}>Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brutal-muted)" }}>Get free test USDC from the Faucet page before joining.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] py-2 text-xs font-black shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  >
                    Go to Faucet →
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={openBridgeModal}
              className="w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--purple)] py-3 text-sm font-black tracking-[0.1em] text-[var(--brutal-card)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
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
              className={`w-full border-[3px] border-[var(--brutal-ink)] py-3 text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_var(--brutal-ink)] mt-3 ${
                joining
                  ? "cursor-not-allowed bg-[var(--brutal-surface)] text-[var(--brutal-muted)] opacity-50"
                  : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5"
              }`}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                  Joining...
                </span>
              ) : t("pools.join")}
            </button>

            <p className="mt-4 text-center text-xs font-semibold" style={{ color: "var(--brutal-muted)" }}>
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
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-6 shadow-[8px_8px_0_var(--brutal-ink)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#e8180a" }}>create_pool</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>{t("pools.createTitle")}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="grid size-10 place-items-center border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--brutal-ink)">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>Pool Name</label>
                <input
                  type="text"
                  maxLength={64}
                  value={createForm.poolName}
                  onChange={(e) => setCreateForm({ ...createForm, poolName: e.target.value })}
                  placeholder="My Awesome Pool"
                  className="min-h-[44px] w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_var(--brutal-ink)] outline-none"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>Description (optional)</label>
                <textarea
                  maxLength={500}
                  value={createForm.poolDescription}
                  onChange={(e) => setCreateForm({ ...createForm, poolDescription: e.target.value })}
                  placeholder="Brief description of your pool..."
                  rows={3}
                  className="min-h-[44px] w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_var(--brutal-ink)] outline-none"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>{t("pools.deposit")} (USDC)</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.depositAmount}
                  onChange={(e) => setCreateForm({ ...createForm, depositAmount: Number(e.target.value) })}
                  className="min-h-[44px] w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_var(--brutal-ink)] outline-none"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>Max Participants (2-50)</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm({ ...createForm, maxParticipants: Number(e.target.value) })}
                  className="min-h-[44px] w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_var(--brutal-ink)] outline-none"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--brutal-muted)" }}>Cycle Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.cycleDuration}
                  onChange={(e) => setCreateForm({ ...createForm, cycleDuration: Number(e.target.value) })}
                  className="min-h-[44px] w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-card)] px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_var(--brutal-ink)] outline-none"
                />
              </div>

              {usdcBalance > 0 ? (
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--success-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--brutal-muted)" }}>USDC Balance</p>
                  <p className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                    {usdcBalance.toFixed(2)} USDC
                  </p>
                </div>
              ) : (
                <div className="border-[3px] border-[var(--brutal-ink)] bg-[var(--warn-soft)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: "var(--brutal-muted)" }}>No USDC Balance</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brutal-muted)" }}>Get free test USDC first to create a pool.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/sponsor", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "claim_usdc", userAddress: account?.address }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          successToast("500 TEST_USDC minted!");
                          setTimeout(() => refetchPools(), 1000);
                        } else {
                          errorToast(data.error || "Faucet failed");
                        }
                      } catch (e) {
                        errorToast(e instanceof Error ? e.message : "Faucet error");
                      }
                    }}
                    className="protocol-font mt-3 w-full border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] py-2 text-xs font-black shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                  >
                    Get 500 USDC from Faucet →
                  </button>
                </div>
              )}

              <div className="space-y-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-4 shadow-[3px_3px_0_var(--brutal-ink)]">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--brutal-muted)" }}>{t("pools.totalValue")}</span>
                  <span className="font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                    {createForm.depositAmount * createForm.maxParticipants} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--brutal-muted)" }}>{t("pools.poolDuration")}</span>
                  <span className="font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                    {createForm.cycleDuration * createForm.maxParticipants} days
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--brutal-muted)" }}>{t("pools.requiredCollateral")}</span>
                  <span className="font-black" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}>
                    {Math.ceil(createForm.depositAmount * 125 / 100)} USDC
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreatePool}
              disabled={creating || linkingMeta}
              className={`w-full border-[3px] border-[var(--brutal-ink)] py-3 text-sm font-black tracking-[0.1em] transition-all shadow-[4px_4px_0_var(--brutal-ink)] ${
                creating || linkingMeta
                  ? "cursor-not-allowed bg-[var(--brutal-surface)] text-[var(--brutal-muted)] opacity-50"
                  : "bg-[var(--brutal-accent)] text-[var(--brutal-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5"
              }`}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                  Creating pool...
                </span>
              ) : linkingMeta ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
                  Linking metadata...
                </span>
              ) : "Create Pool"}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

function FaucetButton({ userAddress, refetchPools }: { userAddress: string; refetchPools: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const handleFaucet = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_usdc", userAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        successToast("500 TEST_USDC minted to your wallet!");
        setTimeout(() => refetchPools(), 2000);
      } else {
        setStatus("error");
        errorToast(data.error || "Faucet failed");
      }
    } catch (e) {
      setStatus("error");
      errorToast(e instanceof Error ? e.message : "Faucet error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFaucet}
      disabled={loading}
      className={`protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] px-4 py-2 text-xs font-black shadow-[3px_3px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 ${
        status === "success" ? "bg-[var(--success-soft)]" : "bg-[var(--warn-soft)]"
      }`}
    >
      {loading ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--brutal-ink)] border-b-transparent" />
          Minting...
        </>
      ) : status === "success" ? (
        "500 USDC Minted!"
      ) : (
        "Get Test USDC"
      )}
    </button>
  );
}
