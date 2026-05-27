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
import { useCurrentAccount } from "@mysten/dapp-kit";
import ConnectSuiWallet from "@/components/ConnectSuiWallet";
import { useLanguage } from "@/context/LanguageContext";
import { useSuccessToast, useErrorToast } from "@/components/Toast";
import {
  usePoolInfo,
  useParticipantInfo,
  useParticipantList,
  useJoinPool,
  useMakeDeposit,
  useCurrentYield,
  useUSDCBalance,
  useUserUSDCcoins,
} from "@/hooks/useSuiContracts";

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

  // Fetch pool data
  const { poolInfo, isLoading: poolLoading, refetch: refetchPool } = usePoolInfo(poolAddress);
  const { participantAddresses, participantCount, isLoading: participantsLoading } = useParticipantList(poolAddress);

  // User-specific data
  const { participantInfo, refetch: refetchParticipant } = useParticipantInfo(poolAddress, address);

  // Live data
  const { currentYield } = useCurrentYield(poolAddress);
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { coins: usdcCoins } = useUserUSDCcoins(address);
  const defaultCoinId = usdcCoins.length > 0 ? usdcCoins[0].coinObjectId : "";

  // Live APY from contract
  const liveApy = poolInfo && poolInfo.totalFunds > 0
    ? Math.round(((currentYield / poolInfo.totalFunds) * 100 * 12) * 10) / 10
    : 8.5;

  // Actions
  const { joinPool, isPending: joining, isSuccess: joinSuccess, error: joinError } = useJoinPool();
  const { makeDeposit, isPending: depositing, isSuccess: depositSuccess, error: depositError } = useMakeDeposit();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

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

  // Pool name based on deposit
  let poolName = "Custom Pool";
  if (depositAmount === 10) poolName = "Small Pool";
  else if (depositAmount === 50) poolName = "Medium Pool";
  else if (depositAmount === 100) poolName = "Large Pool";

  // User is participant
  const isParticipant = participantInfo?.isActive || false;

  // Handle join success
  useEffect(() => {
    if (joinSuccess) {
      setShowJoinModal(false);
      setSuccessMessage({ title: "Successfully Joined", message: "Welcome to the ROSCA pool. Your collateral and cycle status are now tracked." });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Joined Pool", "You are now a participant in this ROSCA.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinSuccess]);

  // Handle deposit success
  useEffect(() => {
    if (depositSuccess) {
      setShowDepositModal(false);
      setSuccessMessage({ title: "Deposit Complete", message: "Your cycle contribution has been submitted successfully." });
      setShowSuccessCelebration(true);
      refetchPool();
      refetchParticipant();
      successToast("Deposit Complete", "Your contribution has been submitted on-chain.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess]);

  // Handle join error
  useEffect(() => {
    if (joinError) errorToast("Join Failed", joinError?.message || "Transaction failed");
  }, [joinError, errorToast]);

  // Handle deposit error
  useEffect(() => {
    if (depositError) errorToast("Deposit Failed", depositError?.message || "Transaction failed");
  }, [depositError, errorToast]);

  // Auto-populate coin ID when modals open
  useEffect(() => {
    if (showJoinModal && defaultCoinId && !joinCoinId) {
      setJoinCoinId(defaultCoinId);
    }
  }, [showJoinModal, defaultCoinId, joinCoinId]);

  useEffect(() => {
    if (showDepositModal && defaultCoinId && !depositCoinId) {
      setDepositCoinId(defaultCoinId);
    }
  }, [showDepositModal, defaultCoinId, depositCoinId]);

  const handleJoinPool = () => {
    joinPool(poolAddress, Math.ceil(depositAmount * (maxParticipants - 1) * 1.25), joinCoinId);
  };

  const handleMakeDeposit = () => {
    makeDeposit(poolAddress, depositAmount, depositCoinId);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-green-100 text-green-700";
      case "active": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (poolLoading) {
    return (
      <main className="min-h-screen bg-[#fbf7ed]">
        <Header />
        <div className="flex items-center justify-center pb-16 pt-32">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-950 border-b-sky-400"></div>
          <span className="protocol-font ml-4 text-sm font-black text-slate-600">Loading pool data...</span>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-10 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(94,200,255,0.32),transparent_30%),linear-gradient(180deg,#fbf7ed,#f8fbff)]" />
        <div className="mx-auto max-w-6xl">
          <Link href="/pools" className="protocol-font mb-6 inline-flex items-center rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("detail.back")}
          </Link>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">
                  {poolName}
                </h1>
                <span className={`protocol-font rounded-full border-2 border-slate-950 px-3 py-1 text-xs font-black ${getStatusColor(status)}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <div className="protocol-font inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-[4px_4px_0_#06111f]">
                {poolAddress}
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
          <div className="mb-6 rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[5px_5px_0_#06111f]">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.2em] text-sky-700">
              Pool detail boundary
            </p>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
              Detail data, member state, deposits, yield signals, and settlement status are
              isolated here so the frontend can connect cleanly to Suivan&apos;s upcoming Sui API
              and contract modules.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Pool Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pool Stats */}
              <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.poolInfo")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.deposit")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{depositAmount} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.members")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{currentParticipants}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#fff1c7] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.cycle")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{currentCycle}/{maxParticipants}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.funds")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">${totalFunds.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="protocol-font text-xs font-black text-slate-500">{t("detail.capacity")}</span>
                    <span className="protocol-font text-sm font-black text-slate-950">
                      {Math.round((currentParticipants / maxParticipants) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border-2 border-slate-950 bg-slate-100">
                    <div
                      className="h-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${(currentParticipants / maxParticipants) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Yield Info */}
              <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.yieldSection")}</h2>
                  <SuiFeeProfile transactionType="join" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#e8e0ff] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.yield")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{currentYield.toFixed(2)} USDC</p>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.estApy")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{liveApy}%</p>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.collateral")}</p>
                    <p className="protocol-font text-xl font-black text-slate-950">{Math.ceil(depositAmount * (maxParticipants - 1) * 1.25)} USDC</p>
                  </div>
                </div>
              </div>

              {/* Pool Analytics Chart */}
              <PoolAnalyticsChart title={`${poolName} Performance`} poolAddress={poolAddress} />

              {/* Participants List */}
              <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
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
                            ? "border-2 border-slate-950 bg-[#d9f8df]"
                            : "border-2 border-slate-950 bg-[#f8fbff]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="protocol-font flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-950 bg-sky-400 font-black text-slate-950">
                            {index + 1}
                          </div>
                          <div>
                            <p className="protocol-font text-sm font-bold text-slate-950">
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </p>
                            {addr.toLowerCase() === address?.toLowerCase() && (
                              <span className="protocol-font text-xs font-black text-teal-700">You</span>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t("detail.noParticipants")}</p>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* User Status Card */}
              {isConnected && (
                <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.yourStatus")}</h2>

                  {isParticipant ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-black text-slate-950">{t("detail.activeParticipant")}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{t("detail.youAreIn")}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-slate-500">{t("detail.collateralLocked")}</span>
                          <span className="protocol-font font-black">{participantInfo?.collateralAmount.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-slate-500">{t("detail.totalDeposited")}</span>
                          <span className="protocol-font font-black">{participantInfo?.totalDeposited.toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="protocol-font text-xs font-black text-slate-500">{t("detail.receivedPayout")}</span>
                          <span className={`protocol-font font-black ${participantInfo?.hasReceivedPayout ? "text-teal-700" : "text-slate-600"}`}>
                            {participantInfo?.hasReceivedPayout ? t("detail.yes") : t("detail.notYet")}
                          </span>
                        </div>
                      </div>

                      {/* Deposit Button for Active Pool */}
                      {status === "active" && (
                        <button
                          onClick={() => setShowDepositModal(true)}
                          className="protocol-font w-full rounded-xl border-2 border-slate-950 bg-sky-400 py-3 font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
                        >
                          {t("detail.makeDeposit")}
                        </button>
                      )}

                      {/* Claim section for completed pool */}
                      {status === "completed" && (participantInfo?.collateralAmount ?? 0) > 0 && (
                        <div className="rounded-2xl border-2 border-slate-950 bg-[#fff1c7] p-4">
                          <h3 className="mb-2 font-black text-slate-950">{t("detail.collateralAvailable")}</h3>
                          <p className="mb-3 text-sm font-semibold text-slate-600">
                            {t("detail.collateralReturned")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
                        <p className="font-semibold text-slate-600">{t("detail.notParticipant")}</p>
                      </div>

                      {status === "open" && (
                        <button
                          onClick={() => setShowJoinModal(true)}
                          className="protocol-font w-full rounded-xl border-2 border-slate-950 bg-sky-400 py-3 font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
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
                <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 shadow-[6px_6px_0_#06111f]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.yourWallet")}</h2>
                  <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
                    <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("detail.usdcBalance")}</p>
                    <p className="protocol-font text-2xl font-black text-slate-950">{usdcBalance.toFixed(2)} USDC</p>
                    {usdcCoins.length > 0 && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{usdcCoins.length} coin{usdcCoins.length > 1 ? 's' : ''} available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Connect Wallet CTA */}
              {!isConnected && (
                <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white p-5 text-center shadow-[6px_6px_0_#06111f]">
                  <h2 className="mb-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.getStarted")}</h2>
                  <p className="mb-4 font-semibold text-slate-500">{t("detail.connectPrompt")}</p>
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
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-slate-950 bg-white p-6 shadow-[8px_8px_0_#06111f]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Join {poolName}</h3>
              <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("pools.deposit")}</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-slate-500">{t("pools.collateral")}</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{Math.ceil(depositAmount * (maxParticipants - 1) * 1.25)} USDC</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Returned at the end of the cycle with yield bonus when available</p>
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">USDC Coin</label>
                {usdcCoins.length > 0 ? (
                  <select
                    value={joinCoinId}
                    onChange={(e) => setJoinCoinId(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
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
                    className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleJoinPool}
                disabled={joining}
                className={`protocol-font w-full rounded-xl border-2 border-slate-950 py-3 font-black transition-all ${
                  joining
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-sky-400 text-slate-950 shadow-[4px_4px_0_#06111f] hover:-translate-y-0.5"
                }`}
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

      {/* Make Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
          <div className="relative w-full max-w-md rounded-[1.75rem] border-2 border-slate-950 bg-white p-6 shadow-[8px_8px_0_#06111f]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{t("detail.makeDeposit")}</h3>
              <button onClick={() => setShowDepositModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-slate-500">Deposit Amount</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
                <p className="protocol-font mb-1 text-xs font-black text-slate-500">Current Cycle</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{currentCycle} of {maxParticipants}</p>
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">USDC Coin</label>
                {usdcCoins.length > 0 ? (
                  <select
                    value={depositCoinId}
                    onChange={(e) => setDepositCoinId(e.target.value)}
                    className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
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
                    className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleMakeDeposit}
                disabled={depositing}
                className={`protocol-font w-full rounded-xl border-2 border-slate-950 py-3 font-black transition-all ${
                  depositing
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-sky-400 text-slate-950 shadow-[4px_4px_0_#06111f] hover:-translate-y-0.5"
                }`}
              >
                {depositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
