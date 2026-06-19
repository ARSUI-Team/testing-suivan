"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { IS_MAINNET } from "@/config/sui";
import { getRequiredCollateralAmount, DEFAULT_COLLATERAL_MULTIPLIER } from "@/lib/poolMath";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, Shield } from "lucide-react";

interface CreatePoolWizardProps {
  isOpen: boolean;
  onClose: () => void;
  usdcBalance: number;
  usdcCoinId?: string;
  onComplete: (form: CreatePoolFormData) => void;
  onPublish?: (name: string, description: string) => Promise<string | null>;
}

export interface CreatePoolFormData {
  poolName: string;
  poolDescription: string;
  depositAmount: number;
  maxParticipants: number;
  cycleDuration: number;
  cycleUnit: "days" | "minutes";
  delegateAgent: boolean;
  usdcCoinId: string;
}

export default function CreatePoolWizard({
  isOpen,
  onClose,
  usdcBalance,
  usdcCoinId = "",
  onComplete,
  onPublish,
}: CreatePoolWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [poolName, setPoolName] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [depositAmount, setDepositAmount] = useState(25);
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [cycleDuration, setCycleDuration] = useState(30);
  const [cycleUnit, setCycleUnit] = useState<"days" | "minutes">("days");
  const [delegateAgent, setDelegateAgent] = useState(false);

  const multiplier = DEFAULT_COLLATERAL_MULTIPLIER;
  const collateral = getRequiredCollateralAmount(depositAmount, maxParticipants, multiplier);
  const totalUpfront = depositAmount + collateral;
  const totalPool = depositAmount * maxParticipants;

  const canNext =
    (step === 1 && poolName.trim().length > 0 && depositAmount > 0 && maxParticipants >= 2) ||
    (step === 2) ||
    (step === 3);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    onComplete({
      poolName: poolName.trim(),
      poolDescription: poolDescription.trim(),
      depositAmount,
      maxParticipants,
      cycleDuration,
      cycleUnit,
      delegateAgent,
      usdcCoinId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto border-[4px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[12px_12px_0_#0a0a0a]">
        {/* Progress Header */}
        <div className="border-b-[4px] border-[#0a0a0a] bg-grid-brutal p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="protocol-font text-xs font-black uppercase tracking-[0.18em] text-[#f8672d]">create_pool_wizard</p>
            <button
              onClick={onClose}
              className="grid size-11 place-items-center border-[3px] border-[#0a0a0a] bg-[#f8672d] shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isComplete = stepNum < step;
              return (
                <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div
                    className={`grid size-10 shrink-0 place-items-center border-[3px] text-sm font-black transition-all ${
                      isComplete
                        ? "border-[#14b8a6] bg-[#ccfbf1] text-[#0d9488]"
                        : isActive
                        ? "border-[#0a0a0a] bg-[#f8672d] text-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a]"
                        : "border-[#a8a49a] bg-[#e8e1d9] text-[#a8a49a]"
                    }`}
                    style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}
                  >
                    {isComplete ? "✓" : stepNum}
                  </div>
                  {stepNum < totalSteps && (
                    <div
                      className={`h-1 flex-1 transition-colors ${
                        stepNum < step ? "bg-[#14b8a6]" : "bg-[#e8e1d9]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]" style={{ fontFamily: "'Courier New', monospace" }}>
              {step === 1 && "Parameters"}
              {step === 2 && "Automation"}
              {step === 3 && "Review"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]" style={{ fontFamily: "'Courier New', monospace" }}>
              step {step}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Pool Parameters */}
          {step === 1 && (
            <div>
              <h3 className="mb-1 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                Pool Parameters
              </h3>
              <p className="mb-6 text-sm font-semibold leading-6 text-[#333333]">
                Configure your ROSCA pool. All values are on-chain and cannot be changed after creation.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                    Pool Name <span className="text-[#f8672d]">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={64}
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                    placeholder="e.g. Family Arisan 2026"
                    className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none focus:border-[#38bdf8]"
                  />
                </div>

                <div>
                  <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                    Description <span className="text-[#a8a49a]">(optional)</span>
                  </label>
                  <textarea
                    maxLength={500}
                    value={poolDescription}
                    onChange={(e) => setPoolDescription(e.target.value)}
                    placeholder="Brief description of your pool purpose..."
                    rows={2}
                    className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none focus:border-[#38bdf8] resize-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                      Deposit / Cycle (USDC)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  <div>
                    <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                      Max Participants (2-50)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                      className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="protocol-font mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#333333]">
                    Cycle Duration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={IS_MAINNET ? 30 : 1}
                      value={cycleDuration}
                      onChange={(e) => setCycleDuration(Number(e.target.value))}
                      className="min-h-[44px] w-full border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none focus:border-[#38bdf8]"
                    />
                    <select
                      value={cycleUnit}
                      onChange={(e) => setCycleUnit(e.target.value as "days" | "minutes")}
                      className="min-h-[44px] border-[3px] border-[#0a0a0a] bg-white px-3 py-3 text-sm font-semibold shadow-[3px_3px_0_#0a0a0a] outline-none"
                    >
                      {!IS_MAINNET && <option value="minutes">Minutes</option>}
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                {/* Live preview */}
                <div className="space-y-2 border-[3px] border-[#0a0a0a] bg-grid-brutal p-4 shadow-[3px_3px_0_#0a0a0a]">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#333333]">Total Pool / Cycle</span>
                    <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      {totalPool} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#333333]">Total Duration</span>
                    <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      {cycleUnit === "minutes"
                        ? (cycleDuration * maxParticipants < 60
                            ? `${cycleDuration * maxParticipants}m`
                            : `${Math.round(cycleDuration * maxParticipants / 60)}h`)
                        : `${cycleDuration * maxParticipants} days`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#333333]">Collateral / Member ({multiplier}%)</span>
                    <span className="font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      {collateral} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t-[2px] border-[#0a0a0a] pt-2">
                    <span className="font-bold text-[#0a0a0a]">Total Upfront</span>
                    <span className="font-black text-[#f8672d]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      {totalUpfront} USDC
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Agent Toggle */}
          {step === 2 && (
            <div>
              <h3 className="mb-1 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                AI Pool Agent
              </h3>
              <p className="mb-6 text-sm font-semibold leading-6 text-[#333333]">
                Our AI agent can manage your pool automatically — starting cycles, selecting winners via Seal RNG, and ending pools. You retain full control.
              </p>

              {/* Agent card */}
              <div className="border-[3px] border-[#0a0a0a] bg-grid-brutal p-6 shadow-[4px_4px_0_#0a0a0a]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid size-14 shrink-0 place-items-center border-[3px] border-[#0a0a0a] bg-[#38bdf8]">
                    <Sparkles className="size-6 text-[#0a0a0a]" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      Autonomous Pool Manager
                    </p>
                    <p className="text-xs font-semibold text-[#333333]">Runs 24/7 on Sui testnet</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {[
                    "Auto-starts pool when full",
                    "Selects winners via verifiable Seal RNG",
                    "Advances cycles and ends pools",
                    "Monitors deadlines — no manual intervention",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-semibold text-[#333333]">
                      <svg className="size-4 shrink-0 text-[#14b8a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setDelegateAgent(!delegateAgent)}
                  className={`w-full border-[3px] py-4 text-sm font-black transition-all ${
                    delegateAgent
                      ? "border-[#0a0a0a] bg-[#f8672d] text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a]"
                      : "border-[#a8a49a] bg-[#e8e1d9] text-[#a8a49a]"
                  }`}
                >
                  {delegateAgent ? (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="size-4" />
                      Agent enabled — will auto-manage
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Shield className="size-4" />
                      Manage manually (no automation)
                    </span>
                  )}
                </button>
              </div>

              {delegateAgent && (
                <div className="mt-4 border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4">
                  <p className="text-xs font-semibold leading-5 text-[#333333]">
                    <strong className="text-[#0a0a0a]">How it works:</strong> After pool creation, your PoolAdminCap will be
                    delegated to the AI agent address. You retain full visibility — all agent actions are visible on-chain.
                    You can revoke delegation anytime.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div>
              <h3 className="mb-1 text-2xl font-black tracking-[-0.04em] text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                Review & Confirm
              </h3>
              <p className="mb-6 text-sm font-semibold leading-6 text-[#333333]">
                Verify all details before creating your pool. This action cannot be undone.
              </p>

              <div className="space-y-3">
                <div className="border-[3px] border-[#0a0a0a] p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Collateral</p>
                      <p className="text-xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                        Standard — {multiplier}% Collateral
                      </p>
                    </div>
                  </div>
                </div>

                {poolName && (
                  <div className="border-[3px] border-[#0a0a0a] p-4 bg-white">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Pool Name</p>
                    <p className="text-lg font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{poolName}</p>
                    {poolDescription && <p className="mt-1 text-sm font-semibold text-[#333333]">{poolDescription}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="border-[3px] border-[#0a0a0a] bg-[#e0f4ff] p-4">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Deposit</p>
                    <p className="text-xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{depositAmount} USDC</p>
                    <p className="text-xs font-semibold text-[#333333]">Per cycle</p>
                  </div>
                  <div className="border-[3px] border-[#0a0a0a] bg-[#ccfbf1] p-4">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Participants</p>
                    <p className="text-xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{maxParticipants}</p>
                    <p className="text-xs font-semibold text-[#333333]">Max members</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border-[3px] border-[#0a0a0a] bg-[#fef9c3] p-4">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Cycle</p>
                    <p className="text-xl font-black text-[#0a0a0a]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                      {cycleDuration}{cycleUnit === "minutes" ? "m" : "d"}
                    </p>
                    <p className="text-xs font-semibold text-[#333333]">
                      Total: {cycleDuration * maxParticipants}{cycleUnit === "minutes" ? "m" : "d"}
                    </p>
                  </div>
                  <div className="border-[3px] border-[#0a0a0a] bg-[#fde8e8] p-4">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Collateral</p>
                    <p className="text-xl font-black text-[#f8672d]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>{collateral} USDC</p>
                    <p className="text-xs font-semibold text-[#333333]">Returned at pool end</p>
                  </div>
                </div>

                <div className="border-[3px] border-[#0a0a0a] bg-[#ede9fe] p-4">
                  <div className="flex items-center gap-2">
                    <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Automation</p>
                    {delegateAgent ? (
                      <span className="flex items-center gap-1 border-[2px] border-[#0a0a0a] bg-[#f8672d] px-2 py-0.5 text-[10px] font-black text-[#0a0a0a]">
                        <Sparkles className="size-3" /> AI Agent
                      </span>
                    ) : (
                      <span className="border-[2px] border-[#0a0a0a] bg-[#a8a49a] px-2 py-0.5 text-[10px] font-black text-white">
                        Manual
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#333333]">
                    {delegateAgent
                      ? "PoolAdminCap will be delegated to AI agent for autonomous management."
                      : "You will manage the pool manually via the dashboard."}
                  </p>
                </div>

                <div className="border-[3px] border-[#0a0a0a] bg-grid-brutal p-4">
                  <p className="protocol-font text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a49a]">Total Upfront Cost</p>
                  <p className="text-3xl font-black text-[#f8672d]" style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif" }}>
                    {totalUpfront} USDC
                  </p>
                  <p className="text-xs font-semibold text-[#333333]">{depositAmount} USDC deposit + {collateral} USDC collateral</p>
                </div>

                {usdcBalance < totalUpfront && (
                  <div className="border-[3px] border-[#e8180a] bg-[#fee2e2] p-4">
                    <p className="text-sm font-bold text-[#e8180a]">Insufficient Balance</p>
                    <p className="mt-1 text-xs font-semibold text-[#333333]">
                      You have {usdcBalance.toFixed(2)} USDC but need {totalUpfront} USDC.
                    </p>
                    <Link
                      href="/faucet"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#0a0a0a] bg-[#38bdf8] py-2 text-xs font-black shadow-[4px_4px_0_#0a0a0a]"
                    >
                      Get USDC from Faucet →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t-[4px] border-[#0a0a0a] bg-grid-brutal p-6">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-white px-4 py-3 text-xs font-black text-[#0a0a0a] shadow-[3px_3px_0_#0a0a0a] transition hover:-translate-x-0.5 touch-manipulation"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canNext}
              className={`flex items-center gap-2 border-[3px] border-[#0a0a0a] px-6 py-3 text-xs font-black shadow-[4px_4px_0_#0a0a0a] transition touch-manipulation ${
                canNext
                  ? "bg-[#f8672d] text-[#0a0a0a] hover:-translate-x-0.5 hover:-translate-y-0.5"
                  : "cursor-not-allowed bg-[#e8e1d9] text-[#a8a49a] opacity-50"
              }`}
            >
              Next
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 border-[3px] border-[#0a0a0a] bg-[#14b8a6] px-6 py-3 text-xs font-black text-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 touch-manipulation"
            >
              <CheckCircle className="size-4" />
              Create Pool
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
