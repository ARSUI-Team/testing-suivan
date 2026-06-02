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
  useCurrentYield,
  useUSDCBalance,
  useUserUSDCcoins,
  useLinkPoolMetadata,
  useClaimFinal,
} from "@/hooks/useSuiContracts";
import { SUI_PACKAGE_ID } from "@/config/sui";
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
  const { joinPool, isPending: joining, isSuccess: joinSuccess, error: joinError, hash: joinHash } = useJoinPool();
  const { makeDeposit, isPending: depositing, isSuccess: depositSuccess, error: depositError, hash: depositHash } = useMakeDeposit();
  const { linkMetadata, isPending: linkingMeta, isSuccess: linkSuccess } = useLinkPoolMetadata();
  const { claimFinal, isPending: claiming, isSuccess: claimSuccess, hash: claimHash, error: claimError } = useClaimFinal();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  // Metadata editor state
  const [showMetaEditor, setShowMetaEditor] = useState(false);
  const [metaName, setMetaName] = useState(walrusMeta?.name || "");
  const [metaDesc, setMetaDesc] = useState(walrusMeta?.description || "");
  const [adminCapId, setAdminCapId] = useState("");
  const [publishingMeta, setPublishingMeta] = useState(false);

  // Auto-fill admin cap from owned objects
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
        const cap = objs.data?.[0];
        if (cap?.data?.objectId) {
          setAdminCapId(cap.data.objectId);
        }
      } catch { /* ignore */ }
    };
    findAdminCap();
  }, [account?.address, adminCapId, client]);

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

  // Determine pool status
  let status: "open" | "active" | "completed" = "open";
  if (isStarted && isActive) status = "active";
  else if (isStarted && !isActive) status = "completed";

  // Pool name from Walrus metadata or fallback
  let poolName = walrusMeta?.name || "Custom Pool";
  if (!walrusMeta) {
    if (depositAmount === 10) poolName = "Small Pool";
    else if (depositAmount === 50) poolName = "Medium Pool";
    else if (depositAmount === 100) poolName = "Large Pool";
  }

  // User is participant
  const isParticipant = participantInfo?.isActive || false;

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

  // Handle join error
  useEffect(() => {
    if (joinError) errorToast("Join Failed", joinError?.message || "Transaction failed");
  }, [joinError, errorToast]);

  // Handle deposit error
  useEffect(() => {
    if (depositError) errorToast("Deposit Failed", depositError?.message || "Transaction failed");
  }, [depositError, errorToast]);

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

  // Auto-populate coin ID when modals open
  if (showJoinModal && defaultCoinId && !joinCoinId) {
    setJoinCoinId(defaultCoinId);
  }
  if (showDepositModal && defaultCoinId && !depositCoinId) {
    setDepositCoinId(defaultCoinId);
  }

  const COLLATERAL_MULTIPLIER = 125;

  const handleJoinPool = () => {
    joinPool(poolAddress, Math.ceil(depositAmount * COLLATERAL_MULTIPLIER / 100), joinCoinId);
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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
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
                      {Math.round((currentParticipants / maxParticipants) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--surface-hover)]">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${(currentParticipants / maxParticipants) * 100}%` }}
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
                    <p className="protocol-font text-xl font-black text-[var(--foreground)]">{Math.ceil(depositAmount * 125 / 100)} USDC</p>
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
              {/* User Status Card */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--border)]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">{t("detail.yourStatus")}</h2>

                  {isParticipant ? (
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
                      </div>

                      {/* Deposit Button for Active Pool */}
                      {status === "active" && (
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
                              🏆 You won the Gacha prize!
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

                      {status === "open" && (
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

              {/* Pool Metadata Editor */}
              {isConnected && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[8px_8px_0_var(--border)]">
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
                <p className="protocol-font text-2xl font-black text-[var(--foreground)]">{Math.ceil(depositAmount * 125 / 100)} USDC</p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Returned at the end of the cycle with yield bonus when available</p>
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">USDC Coin</label>
                {usdcCoins.length > 0 ? (
                  <select
                    value={joinCoinId}
                    onChange={(e) => setJoinCoinId(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--accent-soft)]"
                  >
                    {usdcCoins.map((c) => (
                      <option key={c.coinObjectId} value={c.coinObjectId}>
                        {c.coinObjectId.slice(0, 10)}... ({c.balance.toFixed(2)} USDC)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={joinCoinId}
                    onChange={(e) => setJoinCoinId(e.target.value)}
                    placeholder="0x... (no USDC coins found)"
                    className="min-h-[44px] w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--accent-soft)]"
                  />
                )}
              </div>
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

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">USDC Coin</label>
                {usdcCoins.length > 0 ? (
                  <select
                    value={depositCoinId}
                    onChange={(e) => setDepositCoinId(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--accent-soft)]"
                  >
                    {usdcCoins.map((c) => (
                      <option key={c.coinObjectId} value={c.coinObjectId}>
                        {c.coinObjectId.slice(0, 10)}... ({c.balance.toFixed(2)} USDC)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={depositCoinId}
                    onChange={(e) => setDepositCoinId(e.target.value)}
                    placeholder="0x... (no USDC coins found)"
                    className="min-h-[44px] w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--accent-soft)]"
                  />
                )}
              </div>
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
