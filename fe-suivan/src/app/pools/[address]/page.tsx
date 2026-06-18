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
import {
  usePoolInfo,
  useParticipantInfo,
  useParticipantList,
  useJoinAndDeposit,
  useMakeDeposit,
  useStartPool,
  useSelectWinner,
  useCurrentYield,
  useUSDCBalance,
  useUserUSDCcoins,
  useLinkPoolMetadata,
  useClaimFinal,
} from "@/hooks/useSuiContracts";
import { SUI_PACKAGE_ID } from "@/config/sui";
import { usePoolWalrusMetadata, publishPoolMetadata } from "@/hooks/usePoolWalrusMetadata";
import { Layers, Users, Clock, DollarSign, ArrowLeft, Sparkles, Shield, Trophy, Gift } from "lucide-react";

const CARD_CLASS = "relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[12px_12px_0_#0a0a0a] overflow-hidden";
const BTN_PRIMARY = "border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-3 font-black text-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation";
const BTN_ORANGE = "border-[3px] border-[#0a0a0a] bg-[#f8672d] py-3 font-black text-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation";
const BTN_SUCCESS = "border-[3px] border-[#0a0a0a] bg-[#14b8a6] py-3 font-black text-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation";
const LABEL_MONO = { fontFamily: "'Courier New', monospace" };
const HEADING_FONT = { fontFamily: "'Bebas Neue', system-ui, sans-serif" };

function GrainOverlay() {
  return <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />;
}

function BarcodeStrip({ className = "" }: { className?: string }) {
  return <div className={className || "w-10 h-3"} style={{ background: "repeating-linear-gradient(to right, #0a0a0a 0, #0a0a0a 2px, transparent 2px, transparent 4px)" }} />;
}

function ModalCloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid size-11 place-items-center border-[3px] border-[#0a0a0a] bg-[#f8672d] shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  );
}

function StatBox({ label, value, sub, bg = "bg-[#ccfbf1]", Icon }: { label: string; value: string; sub?: string; bg?: string; Icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className={`border-[3px] border-[#0a0a0a] ${bg} p-4 shadow-[3px_3px_0_#0a0a0a]`}>
      <div className="flex items-center justify-between mb-2">
        <BarcodeStrip className="w-6 h-2" />
        {Icon && <Icon className="size-4 text-[#0a0a0a]" />}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>{label}</p>
      <p className="mt-2 text-2xl font-black leading-none" style={HEADING_FONT}>{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-[#333333]">{sub}</p>}
    </div>
  );
}

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
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [joinCoinId, setJoinCoinId] = useState("");
  const [depositCoinId, setDepositCoinId] = useState("");
  const { t } = useLanguage();
  const { showBridgeModal, openBridgeModal, closeBridgeModal, handleBridgeComplete } = useBridgeToDeposit();

  const { poolInfo, isLoading: poolLoading, refetch: refetchPool } = usePoolInfo(poolAddress);
  const { participantAddresses, participantCount, isLoading: participantsLoading } = useParticipantList(poolAddress);
  const { participantInfo, refetch: refetchParticipant } = useParticipantInfo(poolAddress, address);
  const { currentYield } = useCurrentYield(poolAddress);
  const { cumulative: cumYield, collateral: collYield, total: totalYield } = currentYield;
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { coins: usdcCoins } = useUserUSDCcoins(address);
  const defaultCoinId = usdcCoins.length > 0 ? usdcCoins[0].coinObjectId : "";

  const liveApy = poolInfo && poolInfo.totalFunds > 0 ? Math.round(((totalYield / poolInfo.totalFunds) * 100 * 12) * 10) / 10 : 8.5;
  const { metadata: walrusMeta, refetch: refetchWalrusMeta } = usePoolWalrusMetadata(poolInfo?.walrusMetadataBlobId);

  const { joinPool, isPending: joining, isSuccess: joinSuccess, error: joinError, hash: joinHash } = useJoinPool();
  const { makeDeposit, isPending: depositing, isSuccess: depositSuccess, error: depositError, hash: depositHash } = useMakeDeposit();
  const { startPool, isPending: starting, isSuccess: startSuccess, error: startError } = useStartPool();
  const { selectWinner, isPending: selecting, isSuccess: selectSuccess, error: selectError } = useSelectWinner();
  const { linkMetadata, isPending: linkingMeta, isSuccess: linkSuccess } = useLinkPoolMetadata();
  const { claimFinal, isPending: claiming, isSuccess: claimSuccess, hash: claimHash, error: claimError } = useClaimFinal();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const [showMetaEditor, setShowMetaEditor] = useState(false);
  const [metaName, setMetaName] = useState(walrusMeta?.name || "");
  const [metaDesc, setMetaDesc] = useState(walrusMeta?.description || "");
  const [adminCapId, setAdminCapId] = useState("");
  const [publishingMeta, setPublishingMeta] = useState(false);

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [agentInfo, setAgentInfo] = useState<{ agentAddress: string; managedPools: string[] } | null>(null);
  const [delegating, setDelegating] = useState(false);
  const isManagedByAgent = agentInfo?.managedPools.includes(poolAddress) ?? false;

  useEffect(() => {
    fetch("/api/agent/status").then((r) => r.json()).then((data) => {
      if (data.configured) setAgentInfo({ agentAddress: data.agentAddress, managedPools: (data.managedPools || []).map((p: { poolId: string }) => p.poolId) });
    }).catch(() => {});
  }, [poolAddress]);

  const handleDelegateToAgent = () => {
    if (!adminCapId || !agentInfo?.agentAddress) return;
    setDelegating(true);
    const tx = new Transaction();
    tx.transferObjects([tx.object(adminCapId)], tx.pure.address(agentInfo.agentAddress));
    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        successToast("Delegated to AI Agent", "PoolAdminCap transferred. Agent will now manage this pool.");
        setAdminCapId(""); setDelegating(false);
        fetch("/api/agent/tick", { method: "POST" }).catch(() => {});
      },
      onError: (err) => {
        errorToast("Delegation failed", err?.message || "Transaction failed");
        setDelegating(false);
      },
    });
  };

  const client = useSuiClient();
  useEffect(() => {
    if (!account?.address || adminCapId) return;
    (async () => {
      try {
        const objs = await client.getOwnedObjects({ owner: account.address, filter: { StructType: `${SUI_PACKAGE_ID}::arisan_pool::PoolAdminCap` }, options: { showContent: true } });
        const matching = objs.data?.find((cap) => { const fields = (cap.data?.content as { fields?: Record<string, unknown> })?.fields; return fields?.pool_id === poolAddress; });
        if (matching?.data?.objectId) setAdminCapId(matching.data.objectId);
      } catch { /* ignore */ }
    })();
  }, [account?.address, adminCapId, client, poolAddress]);

  useEffect(() => { if (walrusMeta) { setMetaName(walrusMeta.name || ""); setMetaDesc(walrusMeta.description || ""); } }, [walrusMeta]);
  useEffect(() => { if (linkSuccess) { setShowMetaEditor(false); refetchPool(); refetchWalrusMeta(); successToast("Metadata Updated", "Pool metadata has been linked via Walrus."); } }, [linkSuccess, refetchPool, refetchWalrusMeta, successToast]);

  const handleSaveMetadata = async () => {
    if (!metaName.trim()) { errorToast("Validation", "Pool name is required"); return; }
    setPublishingMeta(true);
    try {
      const blobId = await publishPoolMetadata(metaName, metaDesc, account?.address || "", "");
      if (!blobId) { errorToast("Walrus Error", "Failed to publish metadata to Walrus"); return; }
      linkMetadata(poolAddress, blobId, adminCapId);
    } catch { errorToast("Error", "Failed to save metadata"); } finally { setPublishingMeta(false); }
  };

  const depositAmount = poolInfo?.depositAmount || 0;
  const maxParticipants = poolInfo?.maxParticipants || 0;
  const currentParticipants = poolInfo?.currentParticipants || 0;
  const totalFunds = poolInfo?.totalFunds || 0;
  const currentCycle = poolInfo?.cycle || 0;
  const isStarted = poolInfo?.started || false;
  const isActive = poolInfo?.active || false;
  const isFull = poolInfo?.isFull || false;

  let status: "open" | "active" | "completed" = "open";
  if (isStarted && isActive) status = "active";
  else if (isStarted && !isActive) status = "completed";
  else if (isFull && !isStarted) status = "active";

  let poolName = walrusMeta?.name;
  if (!poolName) {
    if (poolInfo?.walrusMetadataBlobId) { poolName = "Loading name..."; }
    else { poolName = `Pool ${poolAddress.slice(0, 8)}...${poolAddress.slice(-4)}`; }
  }

  const isParticipant = participantInfo?.isActive || false;

  useEffect(() => {
    if (joinSuccess) { setShowJoinModal(false); const txMsg = joinHash ? `\nTx: ${joinHash.slice(0, 10)}…${joinHash.slice(-4)}` : ""; setSuccessMessage({ title: "Successfully Joined", message: `Welcome to the ROSCA pool.${txMsg}` }); setShowSuccessCelebration(true); refetchPool(); refetchParticipant(); successToast("Joined Pool", `You are now a participant.${txMsg}`); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinSuccess, joinHash]);
  useEffect(() => {
    if (depositSuccess) { setShowDepositModal(false); const txMsg = depositHash ? `\nTx: ${depositHash.slice(0, 10)}…${depositHash.slice(-4)}` : ""; setSuccessMessage({ title: "Deposit Complete", message: `Your cycle contribution has been submitted.${txMsg}` }); setShowSuccessCelebration(true); refetchPool(); refetchParticipant(); successToast("Deposit Complete", `Contribution submitted on-chain.${txMsg}`); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess, depositHash]);
  useEffect(() => {
    if (startSuccess) { setSuccessMessage({ title: "Pool Started", message: "The ROSCA pool is now active." }); setShowSuccessCelebration(true); refetchPool(); refetchParticipant(); successToast("Pool Started", "Participants can now make deposits."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSuccess]);
  useEffect(() => { if (selectSuccess) { refetchPool(); refetchParticipant(); successToast("Winner Selected", "Winner selected and paid out."); } }, [selectSuccess]);
  useEffect(() => { if (joinError) errorToast("Join Failed", joinError?.message || "Transaction failed"); }, [joinError, errorToast]);
  useEffect(() => { if (depositError) errorToast("Deposit Failed", depositError?.message || "Transaction failed"); }, [depositError, errorToast]);
  useEffect(() => { if (startError) errorToast("Start Failed", startError?.message || "Transaction failed"); }, [startError, errorToast]);
  useEffect(() => { if (selectError) errorToast("Select Winner Failed", selectError?.message || "Transaction failed"); }, [selectError, errorToast]);
  useEffect(() => {
    if (claimSuccess) { const txMsg = claimHash ? `\nTx: ${claimHash.slice(0, 10)}…${claimHash.slice(-4)}` : ""; setSuccessMessage({ title: "Claim Complete", message: `Collateral + yield returned.${txMsg}` }); setShowSuccessCelebration(true); refetchPool(); refetchParticipant(); successToast("Claim Complete", `Funds returned.${txMsg}`); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimSuccess, claimHash]);
  useEffect(() => { if (claimError && !claimSuccess) errorToast("Claim Failed", claimError?.message || "Transaction failed"); }, [claimError, claimSuccess, errorToast]);

  if (showJoinModal && defaultCoinId && !joinCoinId) setJoinCoinId(defaultCoinId);
  if (showDepositModal && defaultCoinId && !depositCoinId) setDepositCoinId(defaultCoinId);

  const COLLATERAL_MULTIPLIER = 125;
  const handleJoinPool = () => {
    if (!joinCoinId) { errorToast("Validation", "No USDC coin available. Get USDC from Faucet first."); return; }
    joinPool(poolAddress, Math.ceil(depositAmount * COLLATERAL_MULTIPLIER / 100), joinCoinId);
  };
  const handleMakeDeposit = () => { makeDeposit(poolAddress, depositAmount, depositCoinId); };

  const getStatusColor = (s: string) => {
    switch (s) { case "open": return "bg-[#ccfbf1] text-[#0d9488]"; case "active": return "bg-[#e0f4ff] text-[#0284c7]"; case "completed": return "bg-[#e8e1d9] text-[#a8a49a]"; default: return "bg-[#e8e1d9] text-[#a8a49a]"; }
  };

  if (poolLoading) {
    return (
      <main className="min-h-screen bg-grid-brutal">
        <Header />
        <div className="flex items-center justify-center pb-16 pt-32">
          <div className="h-12 w-12 animate-spin border-2 border-[#0a0a0a] border-b-sky-400"></div>
          <span className="ml-4 text-sm font-black text-[#333333]" style={HEADING_FONT}>Loading pool data...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]" />
        <div className="mx-auto max-w-6xl">
          <Link href="/pools" className="inline-flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#0a0a0a] shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-y-0.5">
            <ArrowLeft className="size-4" />
            {t("detail.back")}
          </Link>

          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl" style={HEADING_FONT}>{poolName}</h1>
                <span className={`inline-flex items-center border-[3px] border-[#0a0a0a] px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] ${getStatusColor(status)}`} style={LABEL_MONO}>
                  {status}
                </span>
              </div>
              <div className="inline-flex max-w-full items-center gap-1.5 overflow-hidden border-[3px] border-[#0a0a0a] bg-[#fdfdfa] px-4 py-2 text-xs font-black text-[#333333] shadow-[5px_5px_0_#0a0a0a]">
                <span className="max-w-[200px] truncate md:max-w-none" style={LABEL_MONO}>{poolAddress}</span>
                <Sparkles className="size-3.5 text-[#0a0a0a]" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SharePool poolAddress={poolAddress} poolName={poolName} monthlyDeposit={depositAmount} participants={currentParticipants} maxParticipants={maxParticipants} apy={liveApy} />
              {!isConnected && <ConnectSuiWallet variant="header" scrolled={true} />}
            </div>
          </div>
        </div>
      </section>

      {/* Nameless Pool Banner */}
      {poolInfo && !poolInfo.walrusMetadataBlobId && (
        <section className="px-5 pt-2 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-5 shadow-[8px_8px_0_#0a0a0a]">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)", backgroundSize: "4px 4px", opacity: 0.05 }} />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📛</span>
                  <div>
                    <p className="text-sm font-black text-[#0a0a0a]" style={HEADING_FONT}>This pool has no name yet</p>
                    <p className="text-xs font-semibold text-[#333333]">Add a name via Walrus to make it easy to share and identify. Names are stored permanently on-chain.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMetaEditor(true)}
                  className="border-[3px] border-[#0a0a0a] bg-[#f8672d] px-5 py-3 text-xs font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation"
                >
                  Add Pool Name →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">

              {/* Pool Stats */}
              <div className={CARD_CLASS}>
                <GrainOverlay />
                <div className="relative z-20 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <BarcodeStrip className="w-12 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>stats</span>
                  </div>
                  <h2 className="mb-5 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.poolInfo")}</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatBox label={t("detail.deposit")} value={`${depositAmount} USDC`} bg="bg-[#e0f4ff]" />
                    <StatBox label={t("detail.members")} value={`${currentParticipants}/${maxParticipants}`} bg="bg-[#ccfbf1]" Icon={Users} />
                    <StatBox label={t("detail.cycle")} value={`${currentCycle}/${maxParticipants}`} bg="bg-[#fef9c3]" Icon={Clock} />
                    <StatBox label={t("detail.funds")} value={`$${totalFunds.toFixed(2)}`} bg="bg-[#e0f4ff]" Icon={DollarSign} />
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>{t("detail.capacity")}</span>
                      <span className="text-sm font-black" style={HEADING_FONT}>{Math.round((currentParticipants / maxParticipants) * 100)}%</span>
                    </div>
                    <div className="h-4 w-full overflow-hidden border-[3px] border-[#0a0a0a] bg-[#e8e1d9]">
                      <div className="h-full bg-[#38bdf8] transition-all duration-500" style={{ width: `${(currentParticipants / maxParticipants) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t-[3px] border-[#0a0a0a] flex justify-between items-end">
                    <BarcodeStrip className="w-16 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>capacity</span>
                  </div>
                </div>
              </div>

              {/* Walrus Metadata Description */}
              {walrusMeta?.description && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <BarcodeStrip className="w-12 h-4" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>about</span>
                    </div>
                    <h2 className="mb-3 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>About</h2>
                    <p className="font-semibold leading-relaxed text-[#333333]">{walrusMeta.description}</p>
                    {walrusMeta.creator && (
                      <p className="mt-3 text-xs font-bold text-[#333333]">
                        Created by {walrusMeta.creator.slice(0, 6)}...{walrusMeta.creator.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {poolInfo?.walrusMetadataBlobId && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-[#14b8a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>Walrus Metadata Linked</p>
                    </div>
                    <p className="text-xs font-mono text-[#333333] break-all">{poolInfo.walrusMetadataBlobId}</p>
                  </div>
                </div>
              )}

              {/* Yield Info */}
              <div className={CARD_CLASS}>
                <GrainOverlay />
                <div className="relative z-20 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <BarcodeStrip className="w-12 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>yield</span>
                  </div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.yieldSection")}</h2>
                    <SuiFeeProfile transactionType="join" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <StatBox label="Yield (Gacha)" value={`${cumYield.toFixed(2)} USDC`} bg="bg-[#ede9fe]" sub="Cumulative jackpot" Icon={Gift} />
                    <StatBox label="Collateral Yield" value={`${collYield.toFixed(2)} USDC`} bg="bg-[#e0f4ff]" sub="Proportional" />
                    <StatBox label={t("detail.estApy")} value={`${liveApy}%`} bg="bg-[#ccfbf1]" />
                    <StatBox label={t("detail.collateral")} value={`${Math.ceil(depositAmount * 125 / 100)} USDC`} bg="bg-[#fef9c3]" sub="Per member" />
                  </div>
                </div>
              </div>

              {/* Pool Analytics Chart */}
              <PoolAnalyticsChart
                title={poolName !== "Loading name..." ? `${poolName} Performance` : "Pool Performance"}
                poolAddress={poolAddress}
                currentValue={liveApy}
              />

              {/* Participants List */}
              <div className={CARD_CLASS}>
                <GrainOverlay />
                <div className="relative z-20 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <BarcodeStrip className="w-12 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>members</span>
                  </div>
                  <h2 className="mb-5 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>
                    {t("detail.participants", { count: participantCount })}
                  </h2>
                  {participantsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin border-[3px] border-[#0a0a0a] border-b-[#38bdf8]" />
                    </div>
                  ) : participantAddresses.length > 0 ? (
                    <div className="space-y-2">
                      {participantAddresses.map((addr, index) => {
                        const isGachaWinner = poolInfo?.gachaWinner?.toLowerCase() === addr.toLowerCase();
                        const isYou = addr.toLowerCase() === address?.toLowerCase();
                        return (
                          <div key={addr} className={`flex items-center justify-between border-[3px] p-3 ${isGachaWinner ? "border-[#f5e642] bg-[#fef9c3]" : isYou ? "border-[#0a0a0a] bg-[#ccfbf1]" : "border-[#0a0a0a] bg-[#fbf7ed]"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center border-[3px] border-[#0a0a0a] font-black text-sm ${isGachaWinner ? "bg-[#f5e642] text-[#0a0a0a]" : "bg-[#38bdf8] text-[#0a0a0a]"}`} style={HEADING_FONT}>{index + 1}</div>
                              <div>
                                <p className="text-sm font-bold" style={LABEL_MONO}>{addr.slice(0, 6)}...{addr.slice(-4)}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {isGachaWinner && <span className="text-xs font-black" style={LABEL_MONO}>🏆 Gacha Winner</span>}
                                  {isYou && <span className="text-xs font-black text-[#0d9488]" style={LABEL_MONO}>You</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm font-semibold text-[#333333]">No participants yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column — Actions */}
            <div className="lg:col-span-1 space-y-8">
              {isConnected && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <BarcodeStrip className="w-12 h-4" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>status</span>
                    </div>
                    <h2 className="mb-5 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.yourStatus")}</h2>

                    {isParticipant ? (
                      <div className="space-y-4">
                        <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-black">{t("detail.activeParticipant")}</span>
                          </div>
                          <p className="text-sm font-semibold text-[#333333]">{t("detail.youAreIn")}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-xs font-black uppercase tracking-[0.1em] text-[#333333]" style={LABEL_MONO}>{t("detail.collateralLocked")}</span><span className="font-black">{participantInfo?.collateralAmount.toFixed(2)} USDC</span></div>
                          <div className="flex justify-between"><span className="text-xs font-black uppercase tracking-[0.1em] text-[#333333]" style={LABEL_MONO}>{t("detail.totalDeposited")}</span><span className="font-black">{participantInfo?.collateralAmount.toFixed(2)} USDC</span></div>
                          <div className="flex justify-between"><span className="text-xs font-black uppercase tracking-[0.1em] text-[#333333]" style={LABEL_MONO}>{t("detail.receivedPayout")}</span><span className={`font-black ${participantInfo?.hasReceivedPayout ? "text-[#0d9488]" : "text-[#333333]"}`}>{participantInfo?.hasReceivedPayout ? t("detail.yes") : t("detail.notYet")}</span></div>
                        </div>

                        {isFull && !isStarted && adminCapId && (
                          <button onClick={() => startPool(poolAddress, adminCapId)} disabled={starting} className={`w-full ${BTN_PRIMARY} ${starting ? "opacity-50 cursor-not-allowed" : ""}`}>
                            {starting ? "Starting Pool..." : "Start Pool"}
                          </button>
                        )}

                        {status === "active" && isStarted && (
                          <button onClick={() => setShowDepositModal(true)} className={`w-full ${BTN_PRIMARY}`}>{t("detail.makeDeposit")}</button>
                        )}

                        {agentInfo && (
                          <div className={`border-[3px] p-4 ${isManagedByAgent ? "border-[#0d9488] bg-[#ccfbf1]" : "border-[#0a0a0a] bg-[#e0f4ff]"}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#333333]" style={LABEL_MONO}>{isManagedByAgent ? "🤖 AI Agent" : "AI Agent"}</p>
                                <p className={`mt-1 text-sm font-black ${isManagedByAgent ? "text-[#0d9488]" : "text-[#0a0a0a]"}`}>{isManagedByAgent ? "Managing automatically" : adminCapId ? "Delegate to automate" : "Available for automation"}</p>
                              </div>
                              {!isManagedByAgent && adminCapId && (
                                <button onClick={handleDelegateToAgent} disabled={delegating} className={`border-[3px] border-[#0284c7] bg-[#38bdf8] px-4 py-2 text-xs font-black shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-y-0.5 disabled:opacity-50 touch-manipulation`}>{delegating ? "Delegating..." : "Delegate"}</button>
                              )}
                            </div>
                          </div>
                        )}

                        {isStarted && isActive && adminCapId && currentCycle > 0 && (
                          <button onClick={() => selectWinner(poolAddress, adminCapId)} disabled={selecting} className={`w-full ${BTN_ORANGE} ${selecting ? "opacity-50 cursor-not-allowed" : ""}`}>
                            {selecting ? "Selecting..." : "Select Winner"}
                          </button>
                        )}

                        {status === "completed" && (participantInfo?.collateralAmount ?? 0) > 0 && (
                          <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4">
                            <h3 className="mb-2 font-black">{t("detail.collateralAvailable")}</h3>
                            <p className="mb-3 text-sm font-semibold text-[#333333]">{t("detail.collateralReturned")}</p>
                            {(participantInfo?.proportionalYieldEarned ?? 0) > 0 && <p className="mb-3 text-sm font-bold text-[#0d9488]">+ Yield Earned: {participantInfo?.proportionalYieldEarned.toFixed(2)} USDC</p>}
                            {participantInfo?.gachaClaimed && <p className="mb-3 text-sm font-bold text-[#f5e642]">🏆 You won the Gacha prize!</p>}
                            <button onClick={() => claimFinal(poolAddress)} disabled={claiming} className={`w-full ${BTN_SUCCESS} ${claiming ? "opacity-50 cursor-not-allowed" : ""}`}>
                              {claiming ? "Claiming..." : "Claim Collateral + Yield"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-4">
                          <p className="font-semibold text-[#333333]">{t("detail.notParticipant")}</p>
                        </div>
                        {status === "open" && !isFull && (
                          <button onClick={() => setShowJoinModal(true)} className={`w-full ${BTN_PRIMARY}`}>{t("detail.joinThisPool")}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Balance */}
              {isConnected && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <BarcodeStrip className="w-12 h-4" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>wallet</span>
                    </div>
                    <h2 className="mb-5 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.yourWallet")}</h2>
                    <StatBox label={t("detail.usdcBalance")} value={`${usdcBalance.toFixed(2)} USDC`} bg="bg-[#ccfbf1]" Icon={DollarSign} />
                    {usdcCoins.length > 0 && <p className="mt-2 text-xs font-semibold text-[#333333]">{usdcCoins.length} coin{usdcCoins.length > 1 ? "s" : ""} available</p>}
                  </div>
                </div>
              )}

              {/* Pool Metadata Editor */}
              {isConnected && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <BarcodeStrip className="w-12 h-4" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#333333]" style={LABEL_MONO}>meta</span>
                    </div>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>Pool Metadata</h2>
                      {walrusMeta && <span className="text-xs font-black text-[#14b8a6]" style={LABEL_MONO}>✓ Walrus</span>}
                    </div>

                    {!showMetaEditor ? (
                      <div className="space-y-3">
                        {walrusMeta ? (
                          <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4">
                            <p className="text-xs font-black" style={LABEL_MONO}>&quot;{walrusMeta.name}&quot;</p>
                            {walrusMeta.description && <p className="mt-1 text-xs text-[#333333] line-clamp-2">{walrusMeta.description}</p>}
                          </div>
                        ) : (
                          <div className="border-[3px] border-[#0a0a0a] bg-[#e8e1d9] p-4"><p className="text-xs text-[#333333]">No Walrus metadata linked.</p></div>
                        )}
                        <button onClick={() => setShowMetaEditor(true)} className={`w-full ${BTN_PRIMARY}`}>{walrusMeta ? "Edit Metadata" : "Add Metadata"}</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]" style={LABEL_MONO}>Pool Name</label>
                          <input type="text" maxLength={64} value={metaName} onChange={(e) => setMetaName(e.target.value)} placeholder="My Awesome Pool" className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]" style={LABEL_MONO}>Description</label>
                          <textarea maxLength={500} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Brief description..." rows={3} className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none resize-none" />
                        </div>
                        {!adminCapId && (
                          <div>
                            <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]" style={LABEL_MONO}>PoolAdminCap ID</label>
                            <input type="text" value={adminCapId} onChange={(e) => setAdminCapId(e.target.value)} placeholder="0x..." className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold text-[#0a0a0a] outline-none" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setShowMetaEditor(false)} className="flex-1 border-[3px] border-[#0a0a0a] bg-[#e8e1d9] py-3 font-black text-[#0a0a0a] transition hover:-translate-y-0.5">Cancel</button>
                          <button onClick={handleSaveMetadata} disabled={publishingMeta || linkingMeta} className={`flex-1 ${BTN_ORANGE} ${(publishingMeta || linkingMeta) ? "opacity-50 cursor-not-allowed" : ""}`}>
                            {publishingMeta ? "Publishing..." : linkingMeta ? "Linking..." : "Save & Link"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connect Wallet CTA */}
              {!isConnected && (
                <div className={CARD_CLASS}>
                  <GrainOverlay />
                  <div className="relative z-20 p-6 text-center">
                    <h2 className="mb-4 text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.getStarted")}</h2>
                    <p className="mb-4 font-semibold text-[#333333]">{t("detail.connectPrompt")}</p>
                    <ConnectSuiWallet variant="header" scrolled={true} />
                  </div>
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
          <div className={`${CARD_CLASS} relative w-full max-w-md max-h-[85vh] overflow-y-auto`}>
            <GrainOverlay />
            <div className="relative z-20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>Join {poolName}</h3>
                <ModalCloseBtn onClick={() => setShowJoinModal(false)} />
              </div>
              <div className="space-y-4 mb-6">
                <div className="border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>{t("pools.deposit")}</p>
                  <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{depositAmount} USDC</p>
                </div>
                <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>{t("pools.collateral")}</p>
                  <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{Math.ceil(depositAmount * 125 / 100)} USDC</p>
                  <p className="mt-1 text-xs font-semibold text-[#333333]">Returned at end of cycle with yield bonus</p>
                </div>
                {usdcBalance > 0 ? (
                  <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>USDC Balance</p>
                    <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{usdcBalance.toFixed(2)} USDC</p>
                  </div>
                ) : (
                  <div className="border-[3px] border-[#0a0a0a] bg-[#fee2e2] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>Insufficient USDC</p>
                    <p className="mt-1 text-sm font-semibold text-[#333333]">Get free test USDC from the Faucet page first.</p>
                    <Link href="/faucet" className="mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-3 text-xs font-black shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-y-0.5">Go to Faucet →</Link>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <button onClick={openBridgeModal} className="w-full border-[3px] border-[#0a0a0a] bg-[#8b5cf6] py-3 font-black text-white shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-y-0.5">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Bridge from other chains
                  </span>
                </button>
                <button onClick={handleJoinPool} disabled={joining} className={`w-full ${BTN_SUCCESS} ${joining ? "opacity-50 cursor-not-allowed" : ""}`}>
                  {joining ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin border-2 border-[#0a0a0a] border-b-transparent" />Joining...</span> : t("pools.join")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Chain Bridge Modal */}
      <CrossChainBridgeModal isOpen={showBridgeModal} onClose={closeBridgeModal} onBridgeComplete={handleBridgeComplete} />

      {/* Make Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
          <div className={`${CARD_CLASS} relative w-full max-w-md max-h-[85vh] overflow-y-auto`}>
            <GrainOverlay />
            <div className="relative z-20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-[-0.04em]" style={HEADING_FONT}>{t("detail.makeDeposit")}</h3>
                <ModalCloseBtn onClick={() => setShowDepositModal(false)} />
              </div>
              <div className="space-y-4 mb-6">
                <div className="border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>Deposit Amount</p>
                  <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{depositAmount} USDC</p>
                </div>
                <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>Current Cycle</p>
                  <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{currentCycle} of {maxParticipants}</p>
                </div>
                {usdcBalance > 0 ? (
                  <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>USDC Balance</p>
                    <p className="text-2xl font-black mt-1" style={HEADING_FONT}>{usdcBalance.toFixed(2)} USDC</p>
                  </div>
                ) : (
                  <div className="border-[3px] border-[#0a0a0a] bg-[#fee2e2] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#333333]" style={LABEL_MONO}>Insufficient USDC</p>
                    <p className="mt-1 text-sm font-semibold text-[#333333]">Get free test USDC from the Faucet page first.</p>
                    <Link href="/faucet" className="mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-3 text-xs font-black shadow-[5px_5px_0_#0a0a0a] transition hover:-translate-y-0.5">Go to Faucet →</Link>
                  </div>
                )}
              </div>
              <button onClick={handleMakeDeposit} disabled={depositing} className={`w-full ${BTN_SUCCESS} ${depositing ? "opacity-50 cursor-not-allowed" : ""}`}>
                {depositing ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin border-2 border-[#0a0a0a] border-b-transparent" />Depositing...</span> : "Make Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration */}
      <SuccessCelebration show={showSuccessCelebration} title={successMessage.title} message={successMessage.message} onClose={() => setShowSuccessCelebration(false)} />
    </main>
  );
}