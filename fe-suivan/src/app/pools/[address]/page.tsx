"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SharePool from "@/components/SharePool";
import SuiFeeProfile from "@/components/SuiFeeProfile";
import PoolAnalyticsChart from "@/components/PoolAnalyticsChart";
import { SuccessCelebration } from "@/components/Confetti";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import ConnectSuiWallet from "@/components/ConnectSuiWallet";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import { CrossChainBridgeModal } from "@/components/CrossChainBridgeModal";
import { useBridgeToDeposit } from "@/hooks/useBridgeToDeposit";
import { triggerPoolStart } from "@/lib/agentTrigger";
import { derivePoolLifecycle } from "@/lib/poolLifecycle";
import { DEFAULT_COLLATERAL_MULTIPLIER, getRequiredCollateralAmount } from "@/lib/poolMath";
import {
  usePoolInfo,
  useParticipantInfo,
  useParticipantList,
  useJoinAndDeposit,
  useMakeDeposit,
  useCurrentYield,
  useUSDCBalance,
  useUserUSDCcoins,
  useLinkPoolMetadata,
  useClaimFinal,
  useClaimWinnerPayout,
} from "@/hooks/useSuiContracts";
import { SUI_PACKAGE_ID, SUI_AGENT_ADDRESS } from "@/config/sui";
import { usePoolWalrusMetadata, publishPoolMetadata } from "@/hooks/usePoolWalrusMetadata";

export default function PoolDetailPage() {
  const params = useParams();
  const poolAddress = params.address as string;
  const account = useCurrentAccount();
  const isConnected = !!account;
  const address = account?.address || "";

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", message: "" });
  const [joinCoinId, setJoinCoinId] = useState("");
  const [depositCoinId, setDepositCoinId] = useState("");
  const { t } = useLanguage();
  const {
    showBridgeModal,
    openBridgeModal,
    closeBridgeModal,
    handleBridgeComplete,
  } = useBridgeToDeposit();

  // Fetch pool data
  const { poolInfo, isLoading: poolLoading, refetch: refetchPool } = usePoolInfo(poolAddress);
  const { participantAddresses, participantCount, isLoading: participantsLoading } = useParticipantList(poolAddress);

  // User-specific data
  const { participantInfo, refetch: refetchParticipant } = useParticipantInfo(poolAddress, address);

  // Live data
  const { currentYield } = useCurrentYield(poolAddress);
  const { cumulative: cumYield, collateral: collYield, total: totalYield } = currentYield;
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { coins: usdcCoins } = useUserUSDCcoins(address);
  const defaultCoinId = usdcCoins.length > 0 ? usdcCoins[0].coinObjectId : "";

  // Live APY from contract
  const liveApy = poolInfo && poolInfo.totalFunds > 0
    ? Math.round(((totalYield / poolInfo.totalFunds) * 100 * 12) * 10) / 10
    : 8.5;

  // Walrus metadata
  const { metadata: walrusMeta, refetch: refetchWalrusMeta } = usePoolWalrusMetadata(poolInfo?.walrusMetadataBlobId);

  // Actions
  const { joinAndDeposit, isPending: joinDepositing, isSuccess: joinDepositSuccess, error: joinDepositError, hash: joinDepositHash } = useJoinAndDeposit();
  const { makeDeposit, isPending: depositing, isSuccess: depositSuccess, error: depositError, hash: depositHash } = useMakeDeposit();
  const { linkMetadata, isPending: linkingMeta, isSuccess: linkSuccess } = useLinkPoolMetadata();
  const { claimFinal, isPending: claiming, isSuccess: claimSuccess, hash: claimHash, error: claimError } = useClaimFinal();
  const { claimWinnerPayout, isPending: claimingWinnerPayout, isSuccess: winnerPayoutSuccess, hash: winnerPayoutHash, error: winnerPayoutError } = useClaimWinnerPayout();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  // Metadata editor state
  const [showMetaEditor, setShowMetaEditor] = useState(false);
  const [metaName, setMetaName] = useState(walrusMeta?.name || "");
  const [metaDesc, setMetaDesc] = useState(walrusMeta?.description || "");
  const [adminCapId, setAdminCapId] = useState("");
  const [publishingMeta, setPublishingMeta] = useState(false);

  // Agent + Lifecycle UI state
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [cycleProgressPct, setCycleProgressPct] = useState(0);
  const [cycleCountdownText, setCycleCountdownText] = useState("");
  const [agentScanCountdown, setAgentScanCountdown] = useState(60);
  const [claimAllPhase, setClaimAllPhase] = useState<"idle" | "claiming_payout" | "claiming_collateral">("idle");
  const [hasDepositedThisCycle, setHasDepositedThisCycleState] = useState(false);

  // Sync hasDepositedThisCycle from participant info
  useEffect(() => {
    setHasDepositedThisCycleState(participantInfo?.depositsThisCycle || false);
  }, [participantInfo?.depositsThisCycle]);

  // Auto-fill admin cap from owned objects — match by pool_id
  const client = useSuiClient();
  useEffect(() => {
    if (!account?.address || adminCapId) return;
    const findAdminCap = async () => {
      try {
        const objs = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: `${SUI_PACKAGE_ID}::arisan_pool::PoolAdminCap` },
          options: { showContent: true },
        });
        const matching = objs.data?.find((cap) => {
          const fields = (cap.data?.content as { fields?: Record<string, unknown> })?.fields;
          return fields?.pool_id === poolAddress;
        });
        if (matching?.data?.objectId) {
          setAdminCapId(matching.data.objectId);
        }
      } catch { /* ignore */ }
    };
    findAdminCap();
  }, [account?.address, adminCapId, client, poolAddress]);

  // Update form when walrus metadata loads
  useEffect(() => {
    if (walrusMeta) {
      setMetaName(walrusMeta.name || "");
      setMetaDesc(walrusMeta.description || "");
    }
  }, [walrusMeta]);

  // Handle link success
  useEffect(() => {
    if (linkSuccess) {
      setShowMetaEditor(false);
      refetchPool();
      refetchWalrusMeta();
      successToast("Metadata Updated", "Pool metadata has been linked via Walrus.");
    }
  }, [linkSuccess, refetchPool, refetchWalrusMeta, successToast]);

  const handleSaveMetadata = async () => {
    if (!metaName.trim()) {
      errorToast("Validation", "Pool name is required");
      return;
    }
    setPublishingMeta(true);
    try {
      const blobId = await publishPoolMetadata(metaName, metaDesc, account?.address || "", "");
      if (!blobId) {
        errorToast("Walrus Error", "Failed to publish metadata to Walrus");
        return;
      }
      linkMetadata(poolAddress, blobId, adminCapId);
    } catch {
      errorToast("Error", "Failed to save metadata");
    } finally {
      setPublishingMeta(false);
    }
  };

  // Format pool info
  const depositAmount = poolInfo?.depositAmount || 0;
  const maxParticipants = poolInfo?.maxParticipants || 0;
  const currentParticipants = poolInfo?.currentParticipants || 0;
  const totalFunds = poolInfo?.totalFunds || 0;
  const currentCycle = poolInfo?.cycle || 0;
  const isStarted = poolInfo?.started || false;
  const isActive = poolInfo?.active || false;

  const isFull = poolInfo?.isFull || false;
  const isParticipant = participantInfo?.isActive || false;

  // ==== Lifecycle State ====
  const lifecycle = derivePoolLifecycle({
    started: isStarted, active: isActive, ended: poolInfo?.isEnded || false, full: isFull,
    currentCycle: poolInfo?.cycle || 0, poolStartTimeMs: poolInfo?.poolStartTimeMs || 0, cycleDurationMs: poolInfo?.cycleDurationMs || 0,
  });

  const actionLog = [
    { label: "Create pool", state: poolInfo ? "done" as const : "waiting" as const, detail: poolAddress ? `${poolAddress.slice(0, 8)}…${poolAddress.slice(-4)}` : "Waiting" },
    { label: "Join pool", state: currentParticipants > 0 ? "done" as const : "waiting" as const, detail: `${currentParticipants}/${maxParticipants || 0} participants` },
    { label: "Make deposit", state: hasDepositedThisCycle ? "done" as const : isStarted && isParticipant ? "ready" as const : "waiting" as const, detail: hasDepositedThisCycle ? "Current cycle paid" : `${depositAmount} USDC per cycle` },
    { label: "Start / advance", state: isStarted ? "done" as const : lifecycle.nextAction === "start_pool" ? "ready" as const : "waiting" as const, detail: isStarted ? `Cycle ${currentCycle}` : isFull ? "Pool is full" : "Waiting for full capacity" },
    { label: "Select winner", state: lifecycle.nextAction === "resolve_cycle" && isStarted ? "ready" as const : "waiting" as const, detail: lifecycle.deadlineReached ? "Deadline reached: slash, then draw" : lifecycle.cycleDeadlineMs ? `Deadline ${new Date(lifecycle.cycleDeadlineMs).toLocaleString()}` : "Waiting for pool start" },
    { label: "Claim final", state: (poolInfo?.isEnded) ? "ready" as const : "waiting" as const, detail: (poolInfo?.isEnded) ? "Collateral + yield available" : "Pool still running" },
  ];

  // Determine pool status
  let status: "open" | "active" | "action_required" | "completed" = "open";
  if (isStarted && isActive) {
    status = lifecycle.deadlineReached ? "action_required" : "active";
  }
  else if (isStarted && !isActive) status = "completed";
  else if (isFull && !isStarted) status = "active";

  // Pool name from Walrus metadata or fallback
  let poolName = walrusMeta?.name || "Custom Pool";
  if (!walrusMeta) {
    if (depositAmount === 10) poolName = "Small Pool";
    else if (depositAmount === 50) poolName = "Medium Pool";
    else if (depositAmount === 100) poolName = "Large Pool";
  }


  // ==== Agent Heartbeat (updates every 1s) ====
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAgentScanCountdown((v) => (v <= 1 ? 60 : v - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // ==== Cycle Progress Bar Timer ====
  useEffect(() => {
    if (!poolInfo?.cycleDurationMs || !poolInfo?.poolStartTimeMs || !poolInfo?.cycle || poolInfo?.isEnded) {
      setCycleProgressPct(0); setCycleCountdownText(""); return;
    }
    const tick = () => {
      const now = Date.now();
      const cycleStart = poolInfo.poolStartTimeMs + (poolInfo.cycle! - 1) * poolInfo.cycleDurationMs;
      const cycleEnd = cycleStart + poolInfo.cycleDurationMs;
      const elapsed = now - cycleStart;
      setCycleProgressPct(Math.min(100, Math.max(0, (elapsed / poolInfo.cycleDurationMs) * 100)));
      if (now >= cycleEnd) {
        setCycleCountdownText("Awaiting agent resolution");
      } else {
        const rem = cycleEnd - now;
        const d = Math.floor(rem / 86400000), h = Math.floor((rem % 86400000) / 3600000);
        const m = Math.floor((rem % 3600000) / 60000), s = Math.floor((rem % 60000) / 1000);
        setCycleCountdownText(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s remaining`);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [poolInfo?.cycleDurationMs, poolInfo?.poolStartTimeMs, poolInfo?.cycle, poolInfo?.isEnded]);

  // ==== Handle join+deposit (atomic) success + auto-start trigger ====
  useEffect(() => {
    if (joinDepositSuccess) {
      setShowJoinModal(false);
      const txMsg = joinDepositHash ? `\nTx: ${joinDepositHash.slice(0, 10)}…${joinDepositHash.slice(-4)}` : "";
      setSuccessMessage({ title: "Joined & Deposited", message: `Welcome! Your cycle 1 contribution is locked.${txMsg}` });
      setShowSuccessCelebration(true);
      refetchPool(); refetchParticipant();
      successToast("Joined & Deposited", `You joined and deposited cycle 1 atomically.${txMsg}`);
      setAgentRunning(true);
      setAgentStatus("Pool may be full — asking agent to start...");
      void (async () => {
        await new Promise((r) => setTimeout(r, 3000));
        const fresh = await refetchPool();
        const p = fresh.data;
        if (!p?.isFull || p?.started || p?.isEnded) { setAgentRunning(false); return; }
        const res = await triggerPoolStart(poolAddress, 0);
        setAgentRunning(false);
        if (res.ok) successToast("Pool Auto-Started", `Agent started the pool.${res.digest ? ` Tx: ${res.digest.slice(0, 10)}…` : ""}`);
        else if (res.status !== 403) errorToast("Auto-Start Skipped", res.error || "Cron will retry.");
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinDepositSuccess, joinDepositHash]);

  // ==== Handle join+deposit error ====
  useEffect(() => {
    if (joinDepositError) errorToast("Join+Deposit Failed", joinDepositError?.message || "Transaction failed");
  }, [joinDepositError, errorToast]);

  // ==== Handle deposit success ====
  useEffect(() => {
    if (depositSuccess) {
      setShowDepositModal(false);
      const txMsg = depositHash ? `\nTx: ${depositHash.slice(0, 10)}…${depositHash.slice(-4)}` : "";
      setSuccessMessage({ title: "Deposit Complete", message: `Your cycle contribution has been submitted.${txMsg}` });
      setShowSuccessCelebration(true);
      refetchPool(); refetchParticipant();
      successToast("Deposit Complete", `Contribution submitted on-chain.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess, depositHash]);

  // ==== Handle deposit error ====
  useEffect(() => {
    if (depositError) errorToast("Deposit Failed", depositError?.message || "Transaction failed");
  }, [depositError, errorToast]);

  // ==== Handle winner payout success (with Claim All chaining) ====
  useEffect(() => {
    if (winnerPayoutSuccess) {
      const txMsg = winnerPayoutHash ? `\nTx: ${winnerPayoutHash.slice(0, 10)}…${winnerPayoutHash.slice(-4)}` : "";
      refetchPool(); refetchParticipant();
      if (claimAllPhase === "claiming_payout") {
        setAgentStatus("Step 1/2 — claiming collateral next...");
        successToast("Step 1/2", `Winner payout withdrawn.${txMsg}`);
        setClaimAllPhase("claiming_collateral");
      } else {
        successToast("Winner Payout Withdrawn", `The cycle payout was sent to your wallet.${txMsg}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerPayoutSuccess, winnerPayoutHash]);

  // ==== Claim All chaining: call claimFinal after payout success ====
  useEffect(() => {
    if (claimAllPhase === "claiming_collateral" && (participantInfo?.collateralAmount ?? 0) > 0) {
      const t = setTimeout(() => claimFinal(poolAddress), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimAllPhase]);

  // ==== Winner payout error (with Claim All reset) ====
  useEffect(() => {
    if (winnerPayoutError && !winnerPayoutSuccess) {
      if (claimAllPhase !== "idle") { setClaimAllPhase("idle"); setAgentStatus(""); }
      errorToast("Withdraw Failed", winnerPayoutError.message || "Transaction failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerPayoutError, winnerPayoutSuccess, errorToast]);

  // ==== Handle claim success (with Claim All completion) ====
  useEffect(() => {
    if (claimSuccess) {
      const txMsg = claimHash ? `\nTx: ${claimHash.slice(0, 10)}…${claimHash.slice(-4)}` : "";
      refetchPool(); refetchParticipant();
      if (claimAllPhase === "claiming_collateral") {
        setSuccessMessage({ title: "Claim All Complete", message: `Winner payout + collateral + yield returned to your wallet.${txMsg}` });
        successToast("Claim All Done", `Step 2/2 — collateral + yield claimed.${txMsg}`);
        setClaimAllPhase("idle"); setAgentStatus("");
      } else {
        setSuccessMessage({ title: "Claim Complete", message: `Collateral + yield returned to your wallet.${txMsg}` });
        successToast("Claim Complete", `Funds returned to your wallet.${txMsg}`);
      }
      setShowSuccessCelebration(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimSuccess, claimHash]);

  // ==== Handle claim error (with Claim All reset) ====
  useEffect(() => {
    if (claimError && !claimSuccess) {
      if (claimAllPhase !== "idle") { setClaimAllPhase("idle"); setAgentStatus(""); }
      errorToast("Claim Failed", claimError?.message || "Transaction failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimError, claimSuccess, errorToast]);

  // Auto-populate coin ID when modals open
  if (showJoinModal && defaultCoinId && !joinCoinId) {
    setJoinCoinId(defaultCoinId);
  }
  if (showDepositModal && defaultCoinId && !depositCoinId) {
    setDepositCoinId(defaultCoinId);
  }

  const COLLATERAL_MULTIPLIER = 125;

  const handleJoinAndDepositPool = () => {
    if (!joinCoinId) {
      errorToast("Validation", "No USDC coin available. Get USDC from Faucet first.");
      return;
    }
    const collateralAmt = getRequiredCollateralAmount(depositAmount, maxParticipants, DEFAULT_COLLATERAL_MULTIPLIER);
    joinAndDeposit(poolAddress, collateralAmt, depositAmount, joinCoinId);
  };

  const handleMakeDeposit = () => {
    makeDeposit(poolAddress, depositAmount, depositCoinId);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-[var(--success-soft)] text-[var(--success-deep)]";
      case "active": return "bg-[var(--accent-soft)] text-[var(--accent-deep)]";
      case "completed": return "bg-[var(--surface-hover)] text-[var(--muted)]";
      default: return "bg-[var(--surface-hover)] text-[var(--muted)]";
    }
  };

  if (poolLoading) {
    return (
      <main className="min-h-screen bg-grid-brutal">
        <Header />
        <div className="flex items-center justify-center pb-16 pt-32">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#0a0a0a] border-b-sky-400"></div>
          <span className="protocol-font ml-4 text-sm font-black text-[var(--muted)]">Loading pool data...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(94,200,255,0.32),transparent_30%)]" />
        <div className="mx-auto max-w-6xl">
          <Link href="/pools" className="protocol-font mb-6 inline-flex items-center rounded-full border-2 border-[#0a0a0a] bg-[#38bdf8] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("detail.back")}
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#0a0a0a] md:text-7xl" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                  {poolName}
                </h1>
                <span className={`protocol-font rounded-full border-2 border-[#0a0a0a] px-3 py-1 text-xs font-black ${getStatusColor(status)}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <div className="protocol-font inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border-2 border-[#0a0a0a] bg-[#38bdf8] px-4 py-2 text-xs font-black text-[var(--muted)] shadow-[4px_4px_0_#0a0a0a]">
                <span className="max-w-[200px] truncate md:max-w-none">{poolAddress}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-9 4h12M7 8h10" />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SharePool
                poolAddress={poolAddress}
                poolName={poolName}
                monthlyDeposit={depositAmount}
                participants={currentParticipants}
                maxParticipants={maxParticipants}
                apy={liveApy}
              />
              {!isConnected && <ConnectSuiWallet variant="header" scrolled={true} />}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Pool Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pool Stats */}
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.poolInfo")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.deposit")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{depositAmount} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--accent-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.members")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{currentParticipants}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--warn-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.cycle")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{currentCycle}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.funds")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">${totalFunds.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="protocol-font text-xs font-black text-[var(--muted)]">{t("detail.capacity")}</span>
                    <span className="protocol-font text-sm font-black text-[#0a0a0a]">
                      {Math.round((currentParticipants / maxParticipants) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[#0a0a0a] bg-[var(--surface-hover)]">
                    <div
                      className="h-full bg-[#38bdf8] transition-all duration-500"
                      style={{ width: `${(currentParticipants / maxParticipants) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Walrus Metadata Description */}
              {walrusMeta?.description && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-2 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">About</h2>
                  <p className="font-semibold leading-relaxed text-[var(--muted)]">{walrusMeta.description}</p>
                  {walrusMeta.creator && (
                    <p className="mt-3 text-xs font-bold text-[var(--muted)]">
                      Created by {walrusMeta.creator.slice(0, 6)}...{walrusMeta.creator.slice(-4)}
                    </p>
                  )}
                </div>
              )}
              {poolInfo?.walrusMetadataBlobId && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="protocol-font text-xs font-black text-[var(--muted)]">Walrus Metadata Linked</p>
                  </div>
                  <p className="mt-1 text-xs font-mono text-[var(--muted)] break-all">{poolInfo.walrusMetadataBlobId}</p>
                </div>
              )}

              {/* Yield Info */}
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.yieldSection")}</h2>
                  <SuiFeeProfile transactionType="join" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--purple-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Cumulative Yield (Gacha)</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{cumYield.toFixed(2)} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--accent-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Collateral Yield (Proportional)</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{collYield.toFixed(2)} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.estApy")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{liveApy}%</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--warn-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.collateral")}</p>
                    <p className="protocol-font text-xl font-black text-[#0a0a0a]">{Math.ceil(depositAmount * 125 / 100)} USDC</p>
                  </div>
                </div>
              </div>

              {/* Pool Analytics Chart */}
              <PoolAnalyticsChart
                title={`${poolName} Performance`}
                poolAddress={poolAddress}
                currentValue={liveApy}
              />

              {/* Participants List */}
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">
                  {t("detail.participants", { count: participantCount })}
                </h2>
                {participantsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </div>
                ) : participantAddresses.length > 0 ? (
                  <div className="space-y-3">
                    {participantAddresses.map((addr, index) => (
                      <div
                        key={addr}
                        className={`flex items-center justify-between p-4 rounded-xl ${
                          addr.toLowerCase() === address?.toLowerCase()
                            ? "border-2 border-[#0a0a0a] bg-[var(--success-soft)]"
                            : "border-2 border-[#0a0a0a] bg-[var(--surface-hover)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`protocol-font flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0a0a0a] font-black text-[#0a0a0a] ${
                            poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase()
                              ? "bg-[var(--yellow)] text-black"
                              : "bg-[#38bdf8]"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="protocol-font text-sm font-bold text-[#0a0a0a]">
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase() && (
                                <span className="protocol-font text-xs font-black text-[var(--yellow)]">🏆 Gacha Winner</span>
                              )}
                              {addr.toLowerCase() === address?.toLowerCase() && (
                                <span className="protocol-font text-xs font-black text-[var(--success-deep)]">You</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {poolInfo?.isEnded && poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase() && (
                          <div className="text-right">
                            <p className="protocol-font text-xs font-black text-[var(--yellow)]">
                              {(poolInfo?.gachaPrize ?? 0).toFixed(2)} USDC
                            </p>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--muted)] text-center py-8">{t("detail.noParticipants")}</p>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* ⏳ Pre-start indicator */}
              {!isStarted && isFull && !poolInfo?.isEnded && (
              <div className="rounded-[1.5rem] border-2 border-[var(--accent)] bg-[var(--accent-soft)] p-5 flex items-center gap-3 animate-pulse shadow-[6px_6px_0_#0a0a0a]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg">⏳</span>
                <div>
                  <p className="protocol-font text-[11px] font-black uppercase text-[var(--accent)]">Pool full — starting soon</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">Agent auto-scans every 60s</p>
                </div>
              </div>
              )}

              {/* 🔄 Cycle Progress Bar */}
              {isStarted && poolInfo?.cycleDurationMs && (
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <div className="flex items-center justify-between mb-2">
                  <p className="protocol-font text-[10px] font-black uppercase text-[var(--muted)]">Cycle {poolInfo?.cycle || 1} Progress</p>
                  <p className={`protocol-font text-[10px] font-black ${cycleCountdownText === "Awaiting agent resolution" ? "text-[var(--warn)] animate-pulse" : "text-[#0a0a0a]"}`}>{cycleCountdownText}</p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[#0a0a0a] bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${cycleProgressPct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-semibold mt-1 text-[var(--muted)]">
                  <span>0%</span>
                  <span>{cycleProgressPct >= 100 ? "⏰ Deadline passed" : `Deadline: ${new Date(poolInfo.poolStartTimeMs + (poolInfo.cycle ?? 1) * poolInfo.cycleDurationMs).toLocaleTimeString()}`}</span>
                </div>
              </div>
              )}

              {/* 🤖 Agent Heartbeat */}
              {!poolInfo?.isEnded && (
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[var(--accent-soft)] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-base">🤖</span>
                  <div className="min-w-0 flex-1">
                    <p className="protocol-font text-[10px] font-black uppercase text-[var(--muted)]">Agent auto-scan</p>
                    <p className="text-xs font-semibold text-[#0a0a0a]">Scans every 60s — next in <span className="font-black text-[var(--accent)]">{agentScanCountdown}s</span></p>
                  </div>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--success)] animate-pulse" />
                </div>
              </div>
              )}

              {/* 📋 Lifecycle Pipeline */}
              <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                <h2 className="mb-3 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">Lifecycle</h2>
                <div className="space-y-2">
                  {actionLog.map((item, idx) => {
                    const isDone = item.state === "done";
                    const isReady = item.state === "ready";
                    return (
                    <div key={item.label} className={`flex items-start gap-3 rounded-2xl border-2 p-3 transition-all ${isDone ? "border-[var(--success)]/40 bg-[var(--success-soft)]/20" : isReady ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/20 animate-pulse" : "border-[#0a0a0a] bg-grid-brutal"}`}>
                      <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${isDone ? "bg-[var(--success)] text-white" : isReady ? "bg-[var(--accent)] text-white" : "bg-[var(--muted)] text-white"}`}>
                        {isDone ? "✓" : isReady ? "●" : (idx + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-black uppercase tracking-[0.08em] ${isDone ? "text-[var(--success)]" : isReady ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{item.label}</p>
                          <span className={`protocol-font rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${isDone ? "bg-[var(--success-soft)] text-[var(--success)]" : isReady ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-hover)] text-[var(--muted)]"}`}>
                            {isDone ? "Done" : isReady ? "Ready" : "Waiting"}
                          </span>
                        </div>
                        <p className={`mt-0.5 text-[11px] font-semibold ${isDone ? "text-[#0a0a0a]" : "text-[var(--muted)]"}`}>{item.detail}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
                {/* ⚡ Force Scan */}
                {!poolInfo?.isEnded && (
                <div className="mt-3 border-t-2 border-dashed border-[var(--muted)] pt-3">
                  <button
                    onClick={async () => {
                      setAgentRunning(true); setAgentStatus("Scanning...");
                      const res = await fetch("/api/agent/auto?poolId=" + poolAddress);
                      const data = await res.json();
                      if (data.acted > 0) {
                        const acts = data.results[poolAddress];
                        setAgentStatus("✅ " + (acts?.join(", ") || "done"));
                        successToast("Agent", `Executed ${acts?.length || 0} actions`);
                        refetchPool();
                      } else { setAgentStatus("⏳ Nothing to do"); }
                      setTimeout(() => { setAgentRunning(false); setAgentStatus(""); }, 3000);
                    }}
                    disabled={agentRunning}
                    className="protocol-font w-full rounded-xl border border-dashed border-[var(--muted)] py-2 text-[10px] font-bold text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  >
                    {agentRunning ? "..." : "⚡ Force Scan Now"}
                  </button>
                  {agentStatus && <p className="mt-1 text-center text-[10px] font-semibold text-[var(--muted)] animate-pulse">{agentStatus}</p>}
                </div>
                )}
                <p className="mt-3 text-[9px] font-semibold text-[var(--muted)] break-all">Agent: {SUI_AGENT_ADDRESS}</p>
              </div>

              {/* User Status Card */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.yourStatus")}</h2>

                  {isParticipant ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-[var(--success-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-black text-[#0a0a0a]">{t("detail.activeParticipant")}</span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--muted)]">{t("detail.youAreIn")}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-[var(--muted)]">{t("detail.collateralLocked")}</span>
                          <span className="protocol-font font-black">{participantInfo?.collateralAmount.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-[var(--muted)]">{t("detail.totalDeposited")}</span>
                          <span className="protocol-font font-black">{participantInfo?.collateralAmount.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-[var(--muted)]">{t("detail.receivedPayout")}</span>
                          <span className={`protocol-font font-black ${participantInfo?.hasReceivedPayout ? "text-[var(--success-deep)]" : "text-[var(--muted)]"}`}>
                            {participantInfo?.hasReceivedPayout ? t("detail.yes") : t("detail.notYet")}
                          </span>
                        </div>
                        {(participantInfo?.pendingWinnerPayout ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-[var(--muted)]">Winner payout available</span>
                          <span className="protocol-font font-black text-[var(--success-deep)]">{(participantInfo?.pendingWinnerPayout ?? 0).toFixed(2)} USDC</span>
                        </div>
                        )}
                      </div>

                      {/* ── Claim All (both payout + collateral available) ── */}
                      {(participantInfo?.pendingWinnerPayout ?? 0) > 0 && status === "completed" && (participantInfo?.collateralAmount ?? 0) > 0 ? (
                        <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent-soft)]/20 p-4">
                          <h3 className="mb-1 font-black text-[#0a0a0a]">🎯 Claim Everything</h3>
                          <p className="mb-3 text-[11px] font-semibold text-[var(--muted)]">You have unclaimed winnings AND your collateral is ready — claim both in one go.</p>
                          <div className="mb-3 space-y-2 rounded-xl border-2 border-[#0a0a0a] bg-white p-3">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-[var(--muted)]">Winner payout</span>
                              <span className="font-black text-[var(--success-deep)]">{(participantInfo?.pendingWinnerPayout ?? 0).toFixed(2)} USDC</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-[var(--muted)]">Collateral</span>
                              <span className="font-black text-[#0a0a0a]">{(participantInfo?.collateralAmount ?? 0).toFixed(2)} USDC</span>
                            </div>
                            {(participantInfo?.proportionalYieldEarned ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-[var(--muted)]">Yield earned</span>
                              <span className="font-black text-[var(--success-deep)]">+{(participantInfo?.proportionalYieldEarned ?? 0).toFixed(2)} USDC</span>
                            </div>
                            )}
                          </div>
                          <button
                            onClick={() => { setClaimAllPhase("claiming_payout"); setAgentStatus("Step 1/2 — claiming winner payout..."); claimWinnerPayout(poolAddress); }}
                            disabled={claimAllPhase !== "idle" || claimingWinnerPayout || claiming}
                            className={`protocol-font w-full rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${claimAllPhase !== "idle" || claimingWinnerPayout || claiming ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]" : "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"}`}
                          >
                            {claimAllPhase === "claiming_payout" ? "Step 1/2 — Claiming payout..." : claimAllPhase === "claiming_collateral" ? "Step 2/2 — Claiming collateral..." : "Claim All (payout + collateral + yield)"}
                          </button>
                          {agentStatus && claimAllPhase !== "idle" && (
                            <p className="mt-2 text-center text-[10px] font-semibold text-[var(--muted)] animate-pulse">{agentStatus}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Individual winner payout (pool not ended) */}
                          {(participantInfo?.pendingWinnerPayout ?? 0) > 0 && (
                            <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                              <h3 className="mb-2 font-black text-[#0a0a0a]">Arisan payout ready</h3>
                              <button onClick={() => claimWinnerPayout(poolAddress)} disabled={claimingWinnerPayout}
                                className={`protocol-font w-full rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${claimingWinnerPayout ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]" : "bg-[var(--success)] text-white shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"}`}>
                                {claimingWinnerPayout ? "Withdrawing..." : "Withdraw Winner Payout"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Deposit button with deposited-this-cycle check */}
                      {(status === "active" || status === "action_required") && isStarted && participantInfo?.isActive && (
                        hasDepositedThisCycle ? (
                          <div className="protocol-font rounded-xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] py-3 text-center font-black text-[#0a0a0a]">✓ Deposited This Cycle</div>
                        ) : (
                          <button onClick={() => setShowDepositModal(true)} className="protocol-font w-full rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-3 font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5">
                            {t("detail.makeDeposit")}
                          </button>
                        )
                      )}

                      {/* Individual claim collateral (pool ended, no pending payout) */}
                      {status === "completed" && (participantInfo?.collateralAmount ?? 0) > 0 && !((participantInfo?.pendingWinnerPayout ?? 0) > 0) && (
                        <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--warn-soft)] p-4">
                          <h3 className="mb-2 font-black text-[#0a0a0a]">{t("detail.collateralAvailable")}</h3>
                          <p className="mb-3 text-sm font-semibold text-[var(--muted)]">{t("detail.collateralReturned")}</p>
                          {(participantInfo?.proportionalYieldEarned ?? 0) > 0 && (
                            <p className="mb-3 text-sm font-bold text-[var(--success-deep)]">+ Yield Earned: {participantInfo?.proportionalYieldEarned.toFixed(2)} USDC</p>
                          )}
                          {participantInfo?.gachaClaimed && (
                            <p className="mb-3 text-sm font-bold text-[var(--yellow)]">🏆 You won the Gacha prize!</p>
                          )}
                          <button onClick={() => claimFinal(poolAddress)} disabled={claiming}
                            className={`protocol-font w-full rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${claiming ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]" : "bg-[#38bdf8] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"}`}>
                            {claiming ? (<span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0a0a0a] border-b-[var(--accent)]" />Claiming...</span>) : "Claim Collateral + Yield"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                        <p className="font-semibold text-[var(--muted)]">{t("detail.notParticipant")}</p>
                      </div>
                      {status === "open" && !isFull && (
                        <button onClick={() => setShowJoinModal(true)} className="protocol-font w-full rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-3 font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5">
                          {t("detail.joinThisPool")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Balance */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.yourWallet")}</h2>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.usdcBalance")}</p>
                    <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{usdcBalance.toFixed(2)} USDC</p>
                    {usdcCoins.length > 0 && (
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{usdcCoins.length} coin{usdcCoins.length > 1 ? 's' : ''} available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Pool Metadata Editor */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">Pool Metadata</h2>
                    {walrusMeta && <span className="protocol-font text-xs font-black text-[var(--success)]">✓ Walrus</span>}
                  </div>

                  {!showMetaEditor ? (
                    <div className="space-y-3">
                      {walrusMeta ? (
                        <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-3">
                          <p className="protocol-font text-xs font-black">&quot;{walrusMeta.name}&quot;</p>
                          {walrusMeta.description && (
                            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{walrusMeta.description}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-3">
                          <p className="text-xs text-[var(--muted)]">No Walrus metadata linked. Add a name and description.</p>
                        </div>
                      )}
                      <button
                        onClick={() => setShowMetaEditor(true)}
                        className="protocol-font w-full rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-3 font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5"
                      >
                        {walrusMeta ? "Edit Metadata" : "Add Metadata"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="protocol-font mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Pool Name</label>
                        <input
                          type="text"
                          maxLength={64}
                          value={metaName}
                          onChange={(e) => setMetaName(e.target.value)}
                          placeholder="My Awesome Pool"
                          className="min-h-[44px] w-full rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none"
                        />
                      </div>
                      <div>
                        <label className="protocol-font mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Description</label>
                        <textarea
                          maxLength={500}
                          value={metaDesc}
                          onChange={(e) => setMetaDesc(e.target.value)}
                          rows={3}
                          placeholder="Describe your pool..."
                          className="min-h-[100px] w-full rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none resize-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowMetaEditor(false)}
                          className="protocol-font min-h-[44px] flex-1 rounded-xl border-2 border-[#0a0a0a] py-3 font-black text-[var(--muted)] transition hover:bg-grid-brutal"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveMetadata}
                          disabled={publishingMeta || linkingMeta}
                          className={`protocol-font flex-1 rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${
                            publishingMeta || linkingMeta
                              ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                              : "bg-[#38bdf8] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
                          }`}
                        >
                          {publishingMeta ? "Publishing..." : linkingMeta ? "Linking..." : "Save & Link"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connect Wallet CTA */}
              {!isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 text-center shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.getStarted")}</h2>
                  <p className="mb-4 font-semibold text-[var(--muted)]">{t("detail.connectPrompt")}</p>
                  <ConnectSuiWallet variant="header" scrolled={true} />
                </div>
              )}

              {/* Wallet Balance */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.yourWallet")}</h2>
                  <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.usdcBalance")}</p>
                    <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{usdcBalance.toFixed(2)} USDC</p>
                    {usdcCoins.length > 0 && (
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{usdcCoins.length} coin{usdcCoins.length > 1 ? 's' : ''} available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Pool Metadata Editor */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 shadow-[6px_6px_0_#0a0a0a]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">Pool Metadata</h2>
                    {walrusMeta && <span className="protocol-font text-xs font-black text-[var(--success)]">✓ Walrus</span>}
                  </div>

                  {!showMetaEditor ? (
                    <div className="space-y-3">
                      {walrusMeta ? (
                        <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-3">
                          <p className="protocol-font text-xs font-black">&quot;{walrusMeta.name}&quot;</p>
                          {walrusMeta.description && (
                            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{walrusMeta.description}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-3">
                          <p className="text-xs text-[var(--muted)]">No Walrus metadata linked. Add a name and description.</p>
                        </div>
                      )}
                      <button
                        onClick={() => setShowMetaEditor(true)}
                        className="protocol-font w-full rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-3 font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5"
                      >
                        {walrusMeta ? "Edit Metadata" : "Add Metadata"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="protocol-font mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Pool Name</label>
                        <input
                          type="text"
                          maxLength={64}
                          value={metaName}
                          onChange={(e) => setMetaName(e.target.value)}
                          placeholder="My Awesome Pool"
                          className="min-h-[44px] w-full rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none"
                        />
                      </div>
                      <div>
                        <label className="protocol-font mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Description</label>
                        <textarea
                          maxLength={500}
                          value={metaDesc}
                          onChange={(e) => setMetaDesc(e.target.value)}
                          placeholder="Brief description..."
                          rows={3}
                          className="min-h-[44px] w-full rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none"
                        />
                      </div>
                      {!adminCapId && (
                        <div>
                          <label className="protocol-font mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">PoolAdminCap ID</label>
                          <input
                            type="text"
                            value={adminCapId}
                            onChange={(e) => setAdminCapId(e.target.value)}
                            placeholder="0x... (required to link metadata)"
                            className="min-h-[44px] w-full rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowMetaEditor(false)}
                          className="protocol-font flex-1 rounded-xl border-2 border-[#0a0a0a] bg-grid-brutal py-3 font-black text-[#0a0a0a] transition hover:-translate-y-0.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveMetadata}
                          disabled={publishingMeta || linkingMeta}
                          className={`protocol-font flex-1 rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${
                            publishingMeta || linkingMeta
                              ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                              : "bg-[#38bdf8] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
                          }`}
                        >
                          {publishingMeta ? "Publishing..." : linkingMeta ? "Linking..." : "Save & Link"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connect Wallet CTA */}
              {!isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-5 text-center shadow-[6px_6px_0_#0a0a0a]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.getStarted")}</h2>
                  <p className="mb-4 font-semibold text-[var(--muted)]">{t("detail.connectPrompt")}</p>
                  <ConnectSuiWallet variant="header" scrolled={true} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Join Pool Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-6 shadow-[8px_8px_0_#0a0a0a]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">Join {poolName}</h3>
              <button onClick={() => setShowJoinModal(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-[#38bdf8] p-2 text-[#0a0a0a] transition hover:-translate-y-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("pools.deposit")}</p>
                <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--accent-soft)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("pools.collateral")}</p>
                <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{Math.ceil(depositAmount * 125 / 100)} USDC</p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Returned at the end of the cycle with yield bonus when available</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">USDC Balance</p>
                  <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{usdcBalance.toFixed(2)} USDC</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--warn-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Get free test USDC from the Faucet page before joinDepositing.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-2 text-xs font-black shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5"
                  >
                    Go to Faucet →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={openBridgeModal}
                className="protocol-font w-full rounded-xl border-2 border-[#0a0a0a] bg-[var(--purple)] py-3 font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Bridge from other chains
                </span>
              </button>

              <button
                onClick={handleJoinAndDepositPool}
                disabled={joinDepositing}
                className={`protocol-font w-full rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${
                  joinDepositing
                    ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                    : "bg-[#38bdf8] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
                }`}
              >
                  {joinDepositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0a0a0a] border-b-[var(--accent)]"></div>
                    Joining...
                  </span>
                ) : (
                  t("pools.join")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Chain Bridge Modal */}
      <CrossChainBridgeModal
        isOpen={showBridgeModal}
        onClose={closeBridgeModal}
        onBridgeComplete={handleBridgeComplete}
      />

      {/* Make Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-[#0a0a0a] bg-[#38bdf8] p-6 shadow-[8px_8px_0_#0a0a0a]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]">{t("detail.makeDeposit")}</h3>
              <button onClick={() => setShowDepositModal(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-[#38bdf8] p-2 text-[#0a0a0a] transition hover:-translate-y-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-[#0a0a0a] bg-grid-brutal p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Deposit Amount</p>
                <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--accent-soft)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Current Cycle</p>
                <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{currentCycle} of {maxParticipants}</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--success-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">USDC Balance</p>
                  <p className="protocol-font text-2xl font-black text-[#0a0a0a]">{usdcBalance.toFixed(2)} USDC</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[#0a0a0a] bg-[var(--warn-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Get free test USDC from the Faucet page first.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0a0a0a] bg-[#38bdf8] py-2 text-xs font-black shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5"
                  >
                    Go to Faucet →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleMakeDeposit}
                disabled={depositing}
                className={`protocol-font w-full rounded-xl border-2 border-[#0a0a0a] py-3 font-black transition-all ${
                  depositing
                    ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                    : "bg-[#38bdf8] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5"
                }`}
              >
                {depositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0a0a0a] border-b-[var(--accent)]"></div>
                    Depositing...
                  </span>
                ) : (
                  "Make Deposit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration */}
      <SuccessCelebration
        show={showSuccessCelebration}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setShowSuccessCelebration(false)}
      />

    </main>
  );
}
