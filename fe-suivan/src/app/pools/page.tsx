"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCurrentAccount } from "@mysten/dapp-kit";
import ConnectSuiWallet from "@/components/ConnectSuiWallet";
import { useLanguage } from "@/context/LanguageContext";
import {
  useAllPoolsWithInfo,
  useJoinPool,
  useCreatePool,
  useUserUSDCcoins,
  useUSDCBalance,
  FormattedPool,
} from "@/hooks/useSuiContracts";
import { useGsapEntrance } from "@/hooks/useGsapEntrance";
import { useSuccessToast, useErrorToast } from "@/components/Toast";

type PoolStatus = "all" | "open" | "active" | "completed";

export default function PoolsPage() {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const [filter, setFilter] = useState<PoolStatus>("all");
  const [selectedPool, setSelectedPool] = useState<FormattedPool | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCoinId, setJoinCoinId] = useState("");
  const { t } = useLanguage();

  const { pools, isLoading: poolsLoading, refetch: refetchPools } = useAllPoolsWithInfo();

  const { coins: usdcCoins } = useUserUSDCcoins(account?.address);
  const { balance: usdcBalance } = useUSDCBalance(account?.address);
  const defaultCoinId = usdcCoins.length > 0 ? usdcCoins[0].coinObjectId : "";

  const { joinPool, isPending: joining, isSuccess: joinSuccess, error: joinError } = useJoinPool();
  const { createPool, isPending: creating, isSuccess: createSuccess, error: createError } = useCreatePool();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const [createForm, setCreateForm] = useState({
    depositAmount: 25,
    maxParticipants: 8,
    cycleDuration: 30,
    usdcCoinId: "",
  });

  // Auto-populate coin ID
  useEffect(() => {
    if (selectedPool && defaultCoinId && !joinCoinId) {
      setJoinCoinId(defaultCoinId);
    }
  }, [selectedPool, defaultCoinId, joinCoinId]);

  useEffect(() => {
    if (showCreateModal && defaultCoinId && !createForm.usdcCoinId) {
      setCreateForm((prev) => ({ ...prev, usdcCoinId: defaultCoinId }));
    }
  }, [showCreateModal, defaultCoinId, createForm.usdcCoinId]);

  useEffect(() => {
    if (joinSuccess) {
      setSelectedPool(null);
      refetchPools();
      successToast("Joined Pool", "You are now a participant. Your collateral is locked.");
    }
  }, [joinSuccess, refetchPools, successToast]);
  useEffect(() => {
    if (createSuccess) {
      setShowCreateModal(false);
      refetchPools();
      successToast("Pool Created", "Your ROSCA pool is now live and open for participants.");
    }
  }, [createSuccess, refetchPools, successToast]);
  useEffect(() => {
    if (joinError) errorToast("Join Failed", joinError?.message || "Transaction failed");
  }, [joinError, errorToast]);
  useEffect(() => {
    if (createError) errorToast("Create Failed", createError?.message || "Transaction failed");
  }, [createError, errorToast]);

  const filteredPools = pools
    ? filter === "all" ? pools : pools.filter((p) => p.status === filter)
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-700";
      case "active": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
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

  const handleJoinPool = () => {
    if (selectedPool) {
      const collateralAmt = Math.ceil(selectedPool.depositAmount * (selectedPool.maxParticipants - 1) * 1.25);
      joinPool(selectedPool.address, collateralAmt, joinCoinId);
    }
  };

  const handleCreatePool = () => {
    createPool(createForm.depositAmount, createForm.maxParticipants, createForm.cycleDuration, createForm.usdcCoinId);
  };

  return (
    <main className="min-h-screen bg-[#fbf7ed] text-slate-950">
      <Header />

      <section ref={gsapRef} className="relative isolate overflow-hidden px-5 pb-14 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(94,200,255,0.32),transparent_30%),linear-gradient(180deg,#fbf7ed,#f8fbff)]" />
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <div className="gsap-up protocol-font mb-5 inline-flex rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] shadow-[4px_4px_0_#06111f]">
              pool_explorer
            </div>
            <h1 className="gsap-up text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">
              {t("pools.title")}
            </h1>
            <p className="gsap-up mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              {t("pools.subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Stats */}
          {pools && pools.length > 0 && (
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[4px_4px_0_#06111f]">
                <p className="protocol-font text-xs font-black text-slate-400">{t("pools.totalPools")}</p>
                <p className="protocol-font mt-2 text-3xl font-black text-slate-950">{pools.length}</p>
              </div>
              <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-4 shadow-[4px_4px_0_#06111f]">
                <p className="protocol-font text-xs font-black text-slate-500">{t("pools.open")}</p>
                <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
                  {pools.filter((p) => p.status === "open").length}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4 shadow-[4px_4px_0_#06111f]">
                <p className="protocol-font text-xs font-black text-slate-500">{t("pools.active")}</p>
                <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
                  {pools.filter((p) => p.status === "active").length}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-slate-950 bg-[#fff1c7] p-4 shadow-[4px_4px_0_#06111f]">
                <p className="protocol-font text-xs font-black text-slate-500">{t("pools.usdc")}</p>
                <p className="protocol-font mt-2 text-3xl font-black text-slate-950">
                  {isConnected ? "---" : "---"}
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
            <div className="w-full overflow-x-auto scrollbar-hide md:w-auto">
              <div className="flex min-w-max items-center gap-2 rounded-full border-2 border-slate-950 bg-white p-1 shadow-[4px_4px_0_#06111f]">
                {(["all", "open", "active", "completed"] as PoolStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`protocol-font min-h-[44px] whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition-all ${
                      filter === status
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-[#dff8ff] hover:text-slate-950"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="protocol-font min-h-[44px] whitespace-nowrap rounded-full border-2 border-slate-950 bg-sky-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[4px_4px_0_#06111f] transition hover:-translate-y-0.5"
              >
                {t("pools.create")}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <span className="text-sm text-gray-500 text-center sm:text-left">{t("pools.connectWallet")}</span>
                <ConnectSuiWallet variant="header" scrolled={true} />
              </div>
            )}
          </div>

          {/* Loading */}
          {poolsLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white px-6 py-5 shadow-[5px_5px_0_#06111f]">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-950 border-b-sky-400" />
                  <div>
                    <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-sky-700">syncing</p>
                    <p className="mt-1 font-bold text-slate-600">Loading pool state...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pool Grid */}
          {!poolsLoading && (
            <div className="gsap-up grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredPools.map((pool) => (
                <div
                  key={pool.address}
                  className="overflow-hidden rounded-[1.5rem] border-2 border-slate-950 bg-white shadow-[6px_6px_0_#06111f] transition hover:-translate-y-1"
                >
                  <div className="border-b-2 border-slate-950 bg-[#f8fbff] p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <p className="protocol-font text-xs font-black uppercase text-slate-400">object::pool</p>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">{pool.name}</h3>
                        <p className="protocol-font mt-1 text-xs font-bold text-slate-500">
                          {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                        </p>
                      </div>
                      <span className={`protocol-font rounded-full border-2 border-slate-950 px-3 py-1 text-xs font-black ${getStatusColor(pool.status)}`}>
                        {getStatusText(pool.status)}
                      </span>
                    </div>
                    <div className="flex w-fit flex-wrap items-center gap-2 rounded-full border-2 border-slate-950 bg-[#fff1c7] px-3 py-2">
                      <span className="protocol-font text-xs font-black text-slate-950">{pool.apy}% APY</span>
                      <span className="protocol-font whitespace-nowrap text-xs font-black text-slate-500">Yield signal</span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="protocol-font mb-1 text-xs font-black text-slate-400">{t("pools.deposit")}</p>
                        <p className="protocol-font text-lg font-black text-slate-950">{pool.depositAmount} USDC</p>
                      </div>
                      <div>
                        <p className="protocol-font mb-1 text-xs font-black text-slate-400">CYCLE</p>
                        <p className="protocol-font text-lg font-black text-slate-950">{pool.cycleDuration} days</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="protocol-font text-xs font-black text-slate-500">Participants</span>
                        <span className="protocol-font text-sm font-black text-slate-950">
                          {pool.currentParticipants}/{pool.maxParticipants}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full border-2 border-slate-950 bg-slate-100">
                        <div className="h-full bg-teal-400 transition-all duration-500" style={{ width: `${(pool.currentParticipants / pool.maxParticipants) * 100}%` }} />
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-slate-950 bg-[#fbf7ed] p-3">
                      <div className="flex items-center justify-between">
                        <span className="protocol-font text-xs font-black text-slate-500">Total Pool Funds</span>
                        <span className="protocol-font text-lg font-black text-slate-950">
                          ${pool.totalFunds.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {pool.status === "open" && (
                        <button
                          onClick={() => setSelectedPool(pool)}
                          disabled={!isConnected}
                          className={`w-full min-h-[44px] rounded-xl py-3 text-sm font-semibold transition-all ${
                            isConnected
                              ? "border-2 border-slate-950 bg-sky-400 text-slate-950 shadow-[3px_3px_0_#06111f] hover:-translate-y-0.5"
                              : "cursor-not-allowed border-2 border-slate-200 bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isConnected ? t("pools.join") : "Connect Wallet to Join"}
                        </button>
                      )}
                      <a
                        href={`/pools/${pool.address}`}
                        className={`block w-full min-h-[44px] rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                          pool.status === "open"
                            ? "border-2 border-slate-950 bg-white text-slate-950 hover:bg-[#dff8ff]"
                            : pool.status === "active"
                            ? "border-2 border-slate-950 bg-[#dff8ff] text-slate-950 hover:bg-sky-200"
                            : "border-2 border-slate-950 bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            <div className="rounded-[1.5rem] border-2 border-slate-950 bg-white py-16 text-center shadow-[6px_6px_0_#06111f]">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-950 bg-[#dff8ff]">
                <svg className="h-8 w-8 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-black tracking-[-0.03em] text-slate-950">{t("pools.emptyTitle")}</h3>
              <p className="font-semibold text-slate-500">
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPool(null)} />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border-2 border-slate-950 bg-[#fbf7ed] p-6 shadow-[8px_8px_0_#06111f]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-sky-700">join_cycle</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("pools.joinTitle", { name: selectedPool.name })}</h3>
              </div>
              <button onClick={() => setSelectedPool(null)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-slate-950 bg-sky-400 p-2 text-slate-950 transition hover:-translate-y-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="rounded-2xl border-2 border-slate-950 bg-white p-4">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.deposit")}</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{selectedPool.depositAmount} USDC</p>
              </div>

              <div className="rounded-2xl border-2 border-slate-950 bg-[#dff8ff] p-4">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.collateral")}</p>
                <p className="protocol-font text-2xl font-black text-slate-950">
                  {Math.ceil(selectedPool.depositAmount * (selectedPool.maxParticipants - 1) * 1.25)} USDC
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{t("pools.collateralDesc")}</p>
              </div>

              <div className="rounded-2xl border-2 border-slate-950 bg-[#fff1c7] p-4">
                <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.estimatedApy")}</p>
                <p className="protocol-font text-2xl font-black text-slate-950">{selectedPool.apy}%</p>
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.coinLabel")}</label>
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

            <button
              onClick={handleJoinPool}
              disabled={joining}
              className={`w-full min-h-[44px] rounded-xl py-3 text-sm font-semibold transition-all ${
                joining
                  ? "cursor-not-allowed border-2 border-slate-200 bg-slate-100 text-slate-400"
                  : "border-2 border-slate-950 bg-sky-400 text-slate-950 shadow-[3px_3px_0_#06111f] hover:-translate-y-0.5"
              }`}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-b-white" />
                  Joining...
                </span>
              ) : t("pools.join")}
            </button>

            <p className="mt-4 text-center text-xs font-semibold text-slate-500">
              {t("pools.agree", { count: selectedPool.maxParticipants })}
            </p>
          </div>
        </div>
      )}

      {/* Create Pool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border-2 border-slate-950 bg-[#fbf7ed] p-6 shadow-[8px_8px_0_#06111f]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-sky-700">create_pool</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{t("pools.createTitle")}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-slate-950 bg-sky-400 p-2 text-slate-950 transition hover:-translate-y-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.deposit")} (USDC)</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.depositAmount}
                  onChange={(e) => setCreateForm({ ...createForm, depositAmount: Number(e.target.value) })}
                  className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Max Participants (2-50)</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm({ ...createForm, maxParticipants: Number(e.target.value) })}
                  className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Cycle Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.cycleDuration}
                  onChange={(e) => setCreateForm({ ...createForm, cycleDuration: Number(e.target.value) })}
                  className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                />
              </div>

              <div>
                <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t("pools.coinLabel")}</label>
                {usdcCoins.length > 0 ? (
                  <select
                    value={createForm.usdcCoinId}
                    onChange={(e) => setCreateForm({ ...createForm, usdcCoinId: e.target.value })}
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
                    value={createForm.usdcCoinId}
                    onChange={(e) => setCreateForm({ ...createForm, usdcCoinId: e.target.value })}
                    placeholder="0x... (no USDC coins found)"
                    className="min-h-[44px] w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:bg-[#dff8ff]"
                  />
                )}
              </div>

              <div className="space-y-2 rounded-2xl border-2 border-slate-950 bg-white p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">{t("pools.totalValue")}</span>
                  <span className="protocol-font font-black text-slate-950">
                    {createForm.depositAmount * createForm.maxParticipants} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">{t("pools.poolDuration")}</span>
                  <span className="protocol-font font-black text-slate-950">
                    {createForm.cycleDuration * createForm.maxParticipants} days
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">{t("pools.requiredCollateral")}</span>
                  <span className="protocol-font font-black text-slate-950">
                    {Math.ceil(createForm.depositAmount * (createForm.maxParticipants - 1) * 1.25)} USDC
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreatePool}
              disabled={creating}
              className={`w-full min-h-[44px] rounded-xl py-3 text-sm font-semibold transition-all ${
                creating
                  ? "cursor-not-allowed border-2 border-slate-200 bg-slate-100 text-slate-400"
                  : "border-2 border-slate-950 bg-sky-400 text-slate-950 shadow-[3px_3px_0_#06111f] hover:-translate-y-0.5"
              }`}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-b-white" />
                  Creating...
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
        body: JSON.stringify({ action: "mint_faucet", userAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        successToast("10,000 TEST_USDC minted to your wallet!");
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
      className={`protocol-font inline-flex items-center gap-2 rounded-full border-2 border-slate-950 px-4 py-2 text-xs font-black shadow-[3px_3px_0_#06111f] transition hover:-translate-y-0.5 disabled:opacity-50 ${
        status === "success" ? "bg-[#d9f8df] text-green-800" : "bg-[#fff1c7] text-yellow-800"
      }`}
    >
      {loading ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-800 border-b-transparent" />
          Minting...
        </>
      ) : status === "success" ? (
        "10,000 USDC Minted!"
      ) : (
        "Get Test USDC"
      )}
    </button>
  );
}
