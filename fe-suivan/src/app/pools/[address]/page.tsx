"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SharePool from "@/components/SharePool";
import SuiFeeProfile from "@/components/SuiFeeProfile";
import PoolAnalyticsChart from "@/components/PoolAnalyticsChart";
import { SuccessCelebration } from "@/components/Confetti";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import ConnectSuiWallet from "@/components/ConnectSuiWallet";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import { CrossChainBridgeModal } from "@/components/CrossChainBridgeModal";
import { useBridgeToDeposit } from "@/hooks/useBridgeToDeposit";
import {
  usePoolInfo,
  useParticipantInfo,
  useParticipantList,
  useJoinPool,
  useMakeDeposit,
  useStartPool,
  useSelectWinner,
  useEndPool,
  useTransferAdminCap,
  useCurrentYield,
  useUSDCBalance,
  useUserUSDCcoins,
  useLinkPoolMetadata,
  useClaimFinal,
  useClaimWinnerPayout,
} from "@/hooks/useSuiContracts";
import { SUI_AGENT_ADDRESS, SUI_PACKAGE_ID } from "@/config/sui";
import { usePoolWalrusMetadata, publishPoolMetadata } from "@/hooks/usePoolWalrusMetadata";
import { DEFAULT_COLLATERAL_MULTIPLIER, getRequiredCollateralAmount } from "@/lib/poolMath";
import { derivePoolLifecycle, getPoolStatusLabel } from "@/lib/poolLifecycle";

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
  const { participantInfo, isLoading: participantLoading, refetch: refetchParticipant } = useParticipantInfo(poolAddress, address);

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
  const { joinPool, isPending: joining, isSuccess: joinSuccess, error: joinError, hash: joinHash } = useJoinPool();
  const { makeDeposit, isPending: depositing, isSuccess: depositSuccess, error: depositError, hash: depositHash } = useMakeDeposit();
  const { startPool, isPending: starting, isSuccess: startSuccess, error: startError, hash: startHash } = useStartPool();
  const { selectWinner, isPending: selecting, isSuccess: selectSuccess, error: selectError, hash: selectHash } = useSelectWinner();
  const { endPool, isPending: ending, isSuccess: endSuccess, error: endError, hash: endHash } = useEndPool();
  const {
    transferAdminCap,
    isPending: delegating,
    isSuccess: delegateSuccess,
    error: delegateError,
    hash: delegateHash,
  } = useTransferAdminCap();
  const { linkMetadata, isPending: linkingMeta, isSuccess: linkSuccess } = useLinkPoolMetadata();
  const { claimFinal, isPending: claiming, isSuccess: claimSuccess, hash: claimHash, error: claimError } = useClaimFinal();
  const {
    claimWinnerPayout,
    isPending: claimingWinnerPayout,
    isSuccess: winnerPayoutSuccess,
    hash: winnerPayoutHash,
    error: winnerPayoutError,
  } = useClaimWinnerPayout();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  // Metadata editor state
  const [showMetaEditor, setShowMetaEditor] = useState(false);
  const [metaName, setMetaName] = useState(walrusMeta?.name || "");
  const [metaDesc, setMetaDesc] = useState(walrusMeta?.description || "");
  const [adminCapId, setAdminCapId] = useState("");
  const [publishingMeta, setPublishingMeta] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(15);

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSyncCountdown((value) => value <= 1 ? 15 : value - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showJoinModal && defaultCoinId && !joinCoinId) {
      setJoinCoinId(defaultCoinId);
    }
  }, [defaultCoinId, joinCoinId, showJoinModal]);

  useEffect(() => {
    if (showDepositModal && defaultCoinId && !depositCoinId) {
      setDepositCoinId(defaultCoinId);
    }
  }, [defaultCoinId, depositCoinId, showDepositModal]);

  useEffect(() => {
    if (showJoinModal || showDepositModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showJoinModal, showDepositModal]);

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
  const lifecycle = derivePoolLifecycle({
    started: isStarted,
    active: isActive,
    ended: poolInfo?.isEnded || false,
    full: isFull,
    currentCycle,
    poolStartTimeMs: poolInfo?.poolStartTimeMs || 0,
    cycleDurationMs: poolInfo?.cycleDurationMs || 0,
  });
  const status = lifecycle.status;

  // Pool name from Walrus metadata or fallback
  let poolName = walrusMeta?.name || "Custom Pool";
  if (!walrusMeta) {
    if (depositAmount === 10) poolName = "Small Pool";
    else if (depositAmount === 50) poolName = "Medium Pool";
    else if (depositAmount === 100) poolName = "Large Pool";
  }

  // User is participant
  const isParticipant = !!participantInfo;
  const hasAdminCap = !!adminCapId;
  const hasDepositedThisCycle = !!participantInfo?.depositsThisCycle;
  const capacityPct = maxParticipants > 0
    ? Math.min(100, Math.round((currentParticipants / maxParticipants) * 100))
    : 0;
  const cycleDurationDays = poolInfo?.cycleDurationMs
    ? Math.max(1, Math.round(poolInfo.cycleDurationMs / 86_400_000))
    : 0;
  const agentState = !isConnected
    ? "connect_wallet"
    : hasAdminCap
      ? "ready"
      : isStarted
        ? "running_or_delegated"
        : "not_delegated";
  const actionLog = [
    {
      label: "Create pool",
      state: poolInfo ? "done" : "waiting",
      detail: poolAddress ? `${poolAddress.slice(0, 8)}…${poolAddress.slice(-4)}` : "Waiting for pool object",
    },
    {
      label: "Join pool",
      state: currentParticipants > 0 ? "done" : "waiting",
      detail: `${currentParticipants}/${maxParticipants || 0} participants`,
    },
    {
      label: "Make deposit",
      state: hasDepositedThisCycle ? "done" : isStarted && isParticipant ? "ready" : "waiting",
      detail: hasDepositedThisCycle ? "Current cycle paid" : `${depositAmount} USDC per cycle`,
    },
    {
      label: "Start / advance",
      state: isStarted ? "done" : lifecycle.nextAction === "start_pool" && hasAdminCap ? "ready" : "waiting",
      detail: isStarted ? `Cycle ${currentCycle}` : isFull ? "Pool is full" : "Waiting for full capacity",
    },
    {
      label: "Select winner",
      state: lifecycle.nextAction === "resolve_cycle" && hasAdminCap ? "ready" : "waiting",
      detail: lifecycle.deadlineReached
        ? "Deadline reached: slash missing deposits, then draw"
        : lifecycle.cycleDeadlineMs
          ? `Deadline ${new Date(lifecycle.cycleDeadlineMs).toLocaleString()}`
          : "Waiting for pool start",
    },
    {
      label: "Claim final",
      state: status === "completed" ? "ready" : "waiting",
      detail: status === "completed" ? "Collateral + yield available" : "Pool still running",
    },
  ];

  // Handle join success
  useEffect(() => {
    if (joinSuccess) {
      setShowJoinModal(false);
      const txMsg = joinHash ? `\nTx: ${joinHash.slice(0, 10)}…${joinHash.slice(-4)}` : "";
      setSuccessMessage({ title: "Successfully Joined", message: `Welcome to the ROSCA pool.${txMsg}` });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Joined Pool", `You are now a participant.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinSuccess, joinHash]);

  // Handle deposit success
  useEffect(() => {
    if (depositSuccess) {
      setShowDepositModal(false);
      const txMsg = depositHash ? `\nTx: ${depositHash.slice(0, 10)}…${depositHash.slice(-4)}` : "";
      setSuccessMessage({ title: "Deposit Complete", message: `Your cycle contribution has been submitted.${txMsg}` });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Deposit Complete", `Contribution submitted on-chain.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess, depositHash]);

  // Handle start pool success
  useEffect(() => {
    if (startSuccess) {
      const txMsg = startHash ? `\nTx: ${startHash.slice(0, 10)}…${startHash.slice(-4)}` : "Pool started";
      setSuccessMessage({ title: "Pool Started", message: `The ROSCA pool is now active. Participants can make deposits.` });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Pool Started", txMsg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSuccess, startHash]);

  // Handle select winner success
  useEffect(() => {
    if (selectSuccess) {
      refetchPool();
      refetchParticipant();
      const txMsg = selectHash ? `\nTx: ${selectHash.slice(0, 10)}…${selectHash.slice(-4)}` : "";
      successToast("Winner Selected", `The payout is ready for the winner to withdraw.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectSuccess, selectHash]);

  useEffect(() => {
    if (endSuccess) {
      refetchPool();
      refetchParticipant();
      const txMsg = endHash ? `\nTx: ${endHash.slice(0, 10)}…${endHash.slice(-4)}` : "";
      successToast("Pool Ended", `Final claims are now available.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endSuccess, endHash]);

  useEffect(() => {
    if (delegateSuccess) {
      refetchPool();
      const txMsg = delegateHash ? `\nTx: ${delegateHash.slice(0, 10)}…${delegateHash.slice(-4)}` : "";
      successToast("Agent Delegated", `PoolAdminCap transferred to the AI agent.${txMsg}`);
      setAdminCapId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegateSuccess, delegateHash]);

  // Handle join error
  useEffect(() => {
    if (joinError) errorToast("Join Failed", joinError?.message || "Transaction failed");
  }, [joinError, errorToast]);

  // Handle deposit error
  useEffect(() => {
    if (depositError) errorToast("Deposit Failed", depositError?.message || "Transaction failed");
  }, [depositError, errorToast]);

  // Handle start/select errors
  useEffect(() => {
    if (startError) errorToast("Start Failed", startError?.message || "Transaction failed");
  }, [startError, errorToast]);

  useEffect(() => {
    if (selectError) errorToast("Select Winner Failed", selectError?.message || "Transaction failed");
  }, [selectError, errorToast]);

  useEffect(() => {
    if (endError) errorToast("End Pool Failed", endError?.message || "Transaction failed");
  }, [endError, errorToast]);

  useEffect(() => {
    if (delegateError) errorToast("Delegate Agent Failed", delegateError?.message || "Transaction failed");
  }, [delegateError, errorToast]);

  // Handle claim success
  useEffect(() => {
    if (claimSuccess) {
      const txMsg = claimHash ? `\nTx: ${claimHash.slice(0, 10)}…${claimHash.slice(-4)}` : "";
      setSuccessMessage({ title: "Claim Complete", message: `Collateral + yield returned to your wallet.${txMsg}` });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Claim Complete", `Funds returned to your wallet.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimSuccess, claimHash]);

  // Handle claim error
  useEffect(() => {
    if (claimError && !claimSuccess) errorToast("Claim Failed", claimError?.message || "Transaction failed");
  }, [claimError, claimSuccess, errorToast]);

  useEffect(() => {
    if (winnerPayoutSuccess) {
      const txMsg = winnerPayoutHash
        ? `\nTx: ${winnerPayoutHash.slice(0, 10)}…${winnerPayoutHash.slice(-4)}`
        : "";
      refetchPool();
      refetchParticipant();
      successToast("Winner Payout Withdrawn", `The cycle payout was sent to your wallet.${txMsg}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerPayoutSuccess, winnerPayoutHash]);

  useEffect(() => {
    if (winnerPayoutError && !winnerPayoutSuccess) {
      errorToast("Winner Withdraw Failed", winnerPayoutError.message || "Transaction failed");
    }
  }, [winnerPayoutError, winnerPayoutSuccess, errorToast]);

  const COLLATERAL_MULTIPLIER = DEFAULT_COLLATERAL_MULTIPLIER;

  const handleJoinPool = () => {
    if (!joinCoinId) {
      errorToast("Validation", "No USDC coin available. Get USDC from Faucet first.");
      return;
    }
    joinPool(
      poolAddress,
      getRequiredCollateralAmount(depositAmount, maxParticipants, COLLATERAL_MULTIPLIER),
      joinCoinId,
    );
  };

  const handleMakeDeposit = () => {
    makeDeposit(poolAddress, depositAmount, depositCoinId);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-[var(--success-soft)] text-[var(--success-deep)]";
      case "ready": return "bg-[var(--warn-soft)] text-[var(--foreground)]";
      case "active": return "bg-[var(--accent-soft)] text-[var(--accent-deep)]";
      case "action_required": return "bg-[var(--danger-soft)] text-[var(--foreground)]";
      case "completed": return "bg-[var(--surface-hover)] text-[var(--muted)]";
      default: return "bg-[var(--surface-hover)] text-[var(--muted)]";
    }
  };

  if (poolLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex items-center justify-center pb-16 pt-32">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-b-sky-400"></div>
          <span className="protocol-font ml-4 text-sm font-black text-[var(--muted)]">Loading pool data...</span>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-10 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(94,200,255,0.32),transparent_30%)]" />
        <div className="mx-auto max-w-6xl">
          <Link href="/pools" className="protocol-font mb-6 inline-flex items-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("detail.back")}
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[var(--foreground)] md:text-7xl">
                  {poolName}
                </h1>
                <span className={`protocol-font rounded-full border-2 border-[var(--border)] px-3 py-1 text-xs font-black ${getStatusColor(status)}`}>
                  {getPoolStatusLabel(status)}
                </span>
              </div>
              <div className="protocol-font inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black text-[var(--muted)] shadow-[4px_4px_0_var(--border)]">
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
              <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.poolInfo")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.deposit")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{depositAmount} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.members")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{currentParticipants}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.cycle")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{currentCycle}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.funds")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">${totalFunds.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="protocol-font text-xs font-black text-[var(--muted)]">{t("detail.capacity")}</span>
                    <span className="protocol-font text-sm font-black text-[var(--foreground)]">
                      {capacityPct}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--surface-hover)]">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Walrus Metadata Description */}
              {walrusMeta?.description && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <h2 className="mb-2 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">About</h2>
                  <p className="font-semibold leading-relaxed text-[var(--muted)]">{walrusMeta.description}</p>
                  {walrusMeta.creator && (
                    <p className="mt-3 text-xs font-bold text-[var(--muted)]">
                      Created by {walrusMeta.creator.slice(0, 6)}...{walrusMeta.creator.slice(-4)}
                    </p>
                  )}
                </div>
              )}
              {poolInfo?.walrusMetadataBlobId && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="protocol-font text-xs font-black text-[var(--muted)]">Walrus Metadata Linked</p>
                  </div>
                  <p className="mt-1 text-[10px] font-mono text-[var(--muted)] break-all">{poolInfo.walrusMetadataBlobId}</p>
                </div>
              )}

              {/* Yield Info */}
              <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.yieldSection")}</h2>
                  <SuiFeeProfile transactionType="join" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--purple-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Cumulative Yield (Gacha)</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{cumYield.toFixed(2)} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Collateral Yield (Proportional)</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{collYield.toFixed(2)} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.estApy")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{liveApy}%</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.collateral")}</p>
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">
                      {getRequiredCollateralAmount(depositAmount, maxParticipants, COLLATERAL_MULTIPLIER)} USDC
                    </p>
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
              <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
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
                            ? "border-2 border-[var(--border)] bg-[var(--success-soft)]"
                            : "border-2 border-[var(--border)] bg-[var(--surface-hover)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`protocol-font flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] font-black text-[var(--foreground)] ${
                            poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase()
                              ? "bg-[var(--yellow)] text-black"
                              : "bg-[var(--accent)]"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="protocol-font text-sm font-bold text-[var(--foreground)]">
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase() && (
                                <span className="protocol-font text-xs font-black text-[var(--yellow)]">Gacha Winner</span>
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
              <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">AI Pool Agent</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">Lifecycle Control</h2>
                  </div>
                  <span className="protocol-font inline-flex items-center gap-2 rounded-full border-2 border-[var(--border)] bg-[var(--background)] px-3 py-1 text-[10px] font-black text-[var(--foreground)]">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      agentState === "ready" || agentState === "running_or_delegated"
                        ? "bg-[var(--success)]"
                        : "bg-[var(--warn)]"
                    }`} />
                    {agentState === "connect_wallet"
                      ? "Connect"
                      : agentState === "ready"
                        ? "Ready"
                        : agentState === "running_or_delegated"
                          ? "Delegated"
                          : "Local cap"}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-3">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Sync</p>
                    <p className="protocol-font mt-1 text-xl font-black text-[var(--foreground)]">{syncCountdown}s</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-3">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Cycle</p>
                    <p className="protocol-font mt-1 text-xl font-black text-[var(--foreground)]">
                      {cycleDurationDays ? `${cycleDurationDays}d` : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  {actionLog.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-3">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                        item.state === "done"
                          ? "bg-[var(--success)]"
                          : item.state === "ready"
                            ? "bg-[var(--accent)]"
                            : "bg-[var(--muted)]"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="protocol-font text-xs font-black uppercase tracking-[0.08em] text-[var(--foreground)]">{item.label}</p>
                          <span className="protocol-font rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[9px] font-black uppercase text-[var(--muted)]">
                            {item.state}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xs font-semibold text-[var(--muted)]">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => transferAdminCap(adminCapId, SUI_AGENT_ADDRESS)}
                    disabled={!adminCapId || delegating}
                    className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                      !adminCapId || delegating
                        ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                        : "bg-[var(--success)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                    }`}
                  >
                    {delegating ? "Delegating..." : "Delegate to Agent"}
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => startPool(poolAddress, adminCapId)}
                      disabled={!adminCapId || !isFull || isStarted || starting}
                      className={`protocol-font rounded-xl border-2 border-[var(--border)] py-3 text-xs font-black transition-all ${
                        !adminCapId || !isFull || isStarted || starting
                          ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                          : "bg-[var(--accent)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                      }`}
                    >
                      {starting ? "Starting..." : "Start"}
                    </button>
                    <button
                      onClick={() => selectWinner(poolAddress, adminCapId)}
                      disabled={!adminCapId || lifecycle.nextAction !== "resolve_cycle" || selecting || selectSuccess || (isStarted && !hasDepositedThisCycle)}
                      className={`protocol-font rounded-xl border-2 border-[var(--border)] py-3 text-xs font-black transition-all ${
                        !adminCapId || lifecycle.nextAction !== "resolve_cycle" || selecting || selectSuccess || (isStarted && !hasDepositedThisCycle)
                          ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                          : "bg-[var(--warn)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                      }`}
                    >
                      {selecting ? "Selecting..." : selectSuccess ? "✓ Winner Selected" : lifecycle.nextAction === "resolve_cycle" && !hasDepositedThisCycle ? "Deposit First" : "Winner"}
                    </button>
                  </div>
                  <button
                    onClick={() => endPool(poolAddress, adminCapId)}
                    disabled={!adminCapId || !isStarted || !isActive || ending}
                    className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 text-xs font-black transition-all ${
                      !adminCapId || !isStarted || !isActive || ending
                        ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                        : "bg-[var(--danger-soft)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                    }`}
                  >
                    {ending ? "Ending..." : "End Pool"}
                  </button>
                </div>

                <p className="mt-3 break-all text-[10px] font-semibold leading-5 text-[var(--muted)]">
                  Agent: {SUI_AGENT_ADDRESS}
                </p>
              </div>

              {/* User Status Card */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.yourStatus")}</h2>

                  {participantLoading ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                        <p className="font-semibold text-[var(--muted)]">Loading...</p>
                      </div>
                    </div>
                  ) : isParticipant ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-[var(--success-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-black text-[var(--foreground)]">{t("detail.activeParticipant")}</span>
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
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-[var(--muted)]">Winner payout available</span>
                          <span className="protocol-font font-black text-[var(--success-deep)]">
                            {(participantInfo?.pendingWinnerPayout ?? 0).toFixed(2)} USDC
                          </span>
                        </div>
                      </div>

                      {(participantInfo?.pendingWinnerPayout ?? 0) > 0 && (
                        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                          <h3 className="mb-2 font-black text-[var(--foreground)]">Arisan payout ready</h3>
                          <p className="mb-3 text-sm font-semibold text-[var(--muted)]">
                            Only your connected winner address can withdraw this payout.
                          </p>
                          <button
                            onClick={() => claimWinnerPayout(poolAddress)}
                            disabled={claimingWinnerPayout}
                            className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                              claimingWinnerPayout
                                ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                                : "bg-[var(--success)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                            }`}
                          >
                            {claimingWinnerPayout ? "Withdrawing..." : "Withdraw Winner Payout"}
                          </button>
                        </div>
                      )}

                      {/* Deposit Button for Active Pool */}
                      {(status === "active" || status === "action_required") && isStarted && participantInfo?.isActive && (
                        <button
                          onClick={() => setShowDepositModal(true)}
                          className="protocol-font w-full rounded-xl border-2 border-[var(--border)] bg-[var(--accent)] py-3 font-black text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
                        >
                          {t("detail.makeDeposit")}
                        </button>
                      )}

                      {/* Claim section for completed pool */}
                      {status === "completed" && (participantInfo?.collateralAmount ?? 0) > 0 && (
                        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-4">
                          <h3 className="mb-2 font-black text-[var(--foreground)]">{t("detail.collateralAvailable")}</h3>
                          <p className="mb-3 text-sm font-semibold text-[var(--muted)]">
                            {t("detail.collateralReturned")}
                          </p>
                          {(participantInfo?.proportionalYieldEarned ?? 0) > 0 && (
                            <p className="mb-3 text-sm font-bold text-[var(--success-deep)]">
                              + Yield Earned: {participantInfo?.proportionalYieldEarned.toFixed(2)} USDC
                            </p>
                          )}
                          {participantInfo?.gachaClaimed && (
                            <p className="mb-3 text-sm font-bold text-[var(--yellow)]">
                              Gacha prize winner
                            </p>
                          )}
                          <button
                            onClick={() => claimFinal(poolAddress)}
                            disabled={claiming}
                            className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                              claiming
                                ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                                : "bg-[var(--accent)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                            }`}
                          >
                            {claiming ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--border)] border-b-[var(--accent)]" />
                                Claiming...
                              </span>
                            ) : "Claim Collateral + Yield"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                        <p className="font-semibold text-[var(--muted)]">{t("detail.notParticipant")}</p>
                      </div>

                      {status === "open" && !isFull && (
                        <button
                          onClick={() => setShowJoinModal(true)}
                          className="protocol-font w-full rounded-xl border-2 border-[var(--border)] bg-[var(--accent)] py-3 font-black text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
                        >
                          {t("detail.joinThisPool")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Balance */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.yourWallet")}</h2>
                  <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("detail.usdcBalance")}</p>
                    <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{usdcBalance.toFixed(2)} USDC</p>
                    {usdcCoins.length > 0 && (
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{usdcCoins.length} coin{usdcCoins.length > 1 ? 's' : ''} available</p>
                    )}
                  </div>
                </div>
              )}

               {/* Pool Metadata Editor — Admin only */}
               {isConnected && hasAdminCap && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">Pool Metadata</h2>
                    {walrusMeta && <span className="protocol-font text-[10px] font-black text-[var(--success)]">✓ Walrus</span>}
                  </div>

                  {!showMetaEditor ? (
                    <div className="space-y-3">
                      {walrusMeta ? (
                        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-3">
                          <p className="protocol-font text-xs font-black">&quot;{walrusMeta.name}&quot;</p>
                          {walrusMeta.description && (
                            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{walrusMeta.description}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-3">
                          <p className="text-xs text-[var(--muted)]">No Walrus metadata linked. Add a name and description.</p>
                        </div>
                      )}
                      <button
                        onClick={() => setShowMetaEditor(true)}
                        className="protocol-font w-full rounded-xl border-2 border-[var(--border)] bg-[var(--accent)] py-3 font-black text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
                      >
                        {walrusMeta ? "Edit Metadata" : "Add Metadata"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="protocol-font mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Pool Name</label>
                        <input
                          type="text"
                          maxLength={64}
                          value={metaName}
                          onChange={(e) => setMetaName(e.target.value)}
                          placeholder="My Awesome Pool"
                          className="min-h-[44px] w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none"
                        />
                      </div>
                      <div>
                        <label className="protocol-font mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Description</label>
                        <textarea
                          maxLength={500}
                          value={metaDesc}
                          onChange={(e) => setMetaDesc(e.target.value)}
                          placeholder="Brief description..."
                          rows={3}
                          className="min-h-[44px] w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none"
                        />
                      </div>
                      {!adminCapId && (
                        <div>
                          <label className="protocol-font mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">PoolAdminCap ID</label>
                          <input
                            type="text"
                            value={adminCapId}
                            onChange={(e) => setAdminCapId(e.target.value)}
                            placeholder="0x... (required to link metadata)"
                            className="min-h-[44px] w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowMetaEditor(false)}
                          className="protocol-font flex-1 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] py-3 font-black text-[var(--foreground)] transition hover:-translate-y-0.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveMetadata}
                          disabled={publishingMeta || linkingMeta}
                          className={`protocol-font flex-1 rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                            publishingMeta || linkingMeta
                              ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                              : "bg-[var(--accent)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
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
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-[6px_6px_0_var(--border)]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.getStarted")}</h2>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 sm:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[8px_8px_0_var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">Join {poolName}</h3>
              <button onClick={() => setShowJoinModal(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--accent)] p-2 text-[var(--foreground)] transition hover:-translate-y-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("pools.deposit")}</p>
                <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">{t("pools.collateral")}</p>
                <p className="protocol-font text-2xl font-black text-[var(--foreground)]">
                  {getRequiredCollateralAmount(depositAmount, maxParticipants, COLLATERAL_MULTIPLIER)} USDC
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Returned at the end of the cycle with yield bonus when available</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">USDC Balance</p>
                  <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{usdcBalance.toFixed(2)} USDC</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Get free test USDC from the Faucet page before joining.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--accent)] py-2 text-xs font-black shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
                  >
                    Go to Faucet →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={openBridgeModal}
                className="protocol-font w-full rounded-xl border-2 border-[var(--border)] bg-[var(--purple)] py-3 font-black text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
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
                className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                  joining
                    ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                    : "bg-[var(--accent)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                }`}
              >
                  {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--border)] border-b-[var(--accent)]"></div>
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
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[8px_8px_0_var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.makeDeposit")}</h3>
              <button onClick={() => setShowDepositModal(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--accent)] p-2 text-[var(--foreground)] transition hover:-translate-y-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Deposit Amount</p>
                <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--accent-soft)] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Current Cycle</p>
                <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{currentCycle} of {maxParticipants}</p>
              </div>

              {usdcBalance > 0 ? (
                <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--success-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">USDC Balance</p>
                  <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{usdcBalance.toFixed(2)} USDC</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--warn-soft)] p-4">
                  <p className="protocol-font mb-1 text-xs font-black text-[var(--muted)]">Insufficient USDC</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Get free test USDC from the Faucet page first.</p>
                  <Link
                    href="/faucet"
                    className="protocol-font mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--accent)] py-2 text-xs font-black shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
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
                className={`protocol-font w-full rounded-xl border-2 border-[var(--border)] py-3 font-black transition-all ${
                  depositing
                    ? "cursor-not-allowed bg-[var(--surface-hover)] text-[var(--muted)]"
                    : "bg-[var(--accent)] text-[var(--foreground)] shadow-[4px_4px_0_var(--border)] hover:-translate-y-0.5"
                }`}
              >
                {depositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--border)] border-b-[var(--accent)]"></div>
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

      <Footer />
    </main>
  );
}
