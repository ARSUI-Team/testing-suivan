"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_FACTORY_ID } from "@/config/sui";
import { Zap, Database } from "lucide-react";
import { useDeepBookPools, usePoolOrderbook, getPoolInfo, ALL_POOL_KEYS } from "@/hooks/useDeepBook";

const YIELD_STEPS = [
  { id: 1, title: "Withdraw from Pool", desc: "Pool funds are withdrawn via hot potato receipt — if not returned, tx aborts.", icon: "⬆️" },
  { id: 2, title: "Flash Loan from DeepBook V3", desc: "Borrow base/quote asset, execute swap pair, capture arbitrage profit.", icon: "⚡" },
  { id: 3, title: "Return Flash Loan", desc: "Return exact borrowed amount to DeepBook. Hot potato FlashLoan consumed.", icon: "↩️" },
  { id: 4, title: "Split Principal + Profit", desc: "Principal returned to pool_funds, profit deposited to yield_balance.", icon: "💰" },
  { id: 5, title: "Yield Bonus for Winner", desc: "On next select_winner, yield is distributed as bonus to the winner.", icon: "🏆" },
];

function useAllPoolAddresses() {
  const client = useSuiClient();
  return useQuery({
    queryKey: ["suivan", "yield-demo", "pools"],
    queryFn: async () => {
      const obj = await client.getObject({
        id: SUI_FACTORY_ID,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
      const raw = fields?.all_pools as { fields?: { value: { fields?: unknown }[] } } | undefined;
      return (raw?.fields?.value?.map((v: unknown) => String((v as { fields?: { value?: string } }).fields?.value)) ?? []) as string[];
    },
    enabled: !!SUI_FACTORY_ID,
  });
}

function usePoolBalances(poolId: string | null) {
  const client = useSuiClient();
  return useQuery({
    queryKey: ["suivan", "yield-demo", "balances", poolId],
    queryFn: async () => {
      if (!poolId) return null;
      const obj = await client.getObject({ id: poolId, options: { showContent: true } });
      const f = (obj.data?.content as { fields?: Record<string, unknown> })?.fields ?? {};
      const extract = (key: string) => {
        const b = f[key] as { fields?: { value?: string } } | undefined;
        return Number(b?.fields?.value ?? 0);
      };
      return {
        poolFunds: extract("pool_funds_balance"),
        yieldBalance: extract("yield_balance"),
        collateralBalance: extract("collateral_balance"),
        currentCycle: Number(f.current_cycle ?? 0),
        isEnded: Boolean(f.is_ended),
      };
    },
    enabled: !!poolId,
    refetchInterval: 10_000,
  });
}

export default function YieldDemoPage() {
  const { data: poolAddresses } = useAllPoolAddresses();
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txDigest, setTxDigest] = useState("");

  const { data: balances, refetch: refetchBalances } = usePoolBalances(selectedPool);

  const poolFundsDisplay = balances ? (balances.poolFunds / 1_000_000).toFixed(2) : "—";
  const yieldDisplay = balances ? (balances.yieldBalance / 1_000_000).toFixed(2) : "—";
  const collateralDisplay = balances ? (balances.collateralBalance / 1_000_000).toFixed(2) : "—";

  const { data: dbPools } = useDeepBookPools();
  const [selectedDbPool, setSelectedDbPool] = useState<string | null>("DEEP_SUI");
  const { data: orderbook } = usePoolOrderbook(selectedDbPool);

  const dbPoolInfo = selectedDbPool ? getPoolInfo(selectedDbPool) : null;
  const bestBid = orderbook?.bids?.[0]?.price ?? 0;
  const bestAsk = orderbook?.asks?.[0]?.price ?? 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
  const spread = bestBid && bestAsk ? (((bestAsk - bestBid) / midPrice) * 100) : 0;
  const bidDepth = orderbook?.bids?.reduce((s, l) => s + l.price * l.quantity, 0) ?? 0;
  const askDepth = orderbook?.asks?.reduce((s, l) => s + l.price * l.quantity, 0) ?? 0;
  const tvl = bidDepth + askDepth;

  const handleSimulateYield = () => {
    if (txStatus === "pending") return;
    setActiveStep(0);
    setTxStatus("pending");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setActiveStep(step);
      if (step >= YIELD_STEPS.length) {
        clearInterval(interval);
        setTxStatus("success");
        setTxDigest("Simulated: DeepBook V3 flash loan arbitrage flow");
        refetchBalances();
      }
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_var(--brutal-ink)]">
            <Zap className="size-4" />
            DeepBook V3
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            Yield Engine
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            Pool funds are deployed via DeepBook V3 flash loan arbitrage. Hot potato receipts enforce atomic return — if the arbitrage fails, the transaction rolls back. Profit is split: principal back to pool funds, profit to yield balance for winner bonuses.
          </p>
        </div>
      </section>

      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[5px_5px_0_var(--border)]">
              <p className="protocol-font text-xs font-black text-[var(--muted)]">Pool Funds</p>
              <p className="protocol-font mt-2 text-4xl font-black text-[var(--foreground)]">${poolFundsDisplay}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Available for yield deployment</p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[5px_5px_0_var(--border)]">
              <p className="protocol-font text-xs font-black text-[var(--muted)]">Yield Earned</p>
              <p className={`protocol-font mt-2 text-4xl font-black ${Number(yieldDisplay) > 0 ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
                ${yieldDisplay}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Accumulated winner bonuses</p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[5px_5px_0_var(--border)]">
              <p className="protocol-font text-xs font-black text-[var(--muted)]">Collateral</p>
              <p className="protocol-font mt-2 text-4xl font-black text-[var(--foreground)]">${collateralDisplay}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Participant security deposits</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] shadow-[6px_6px_0_var(--border)]">
            <div className="border-b-2 border-[var(--border)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="protocol-font text-lg font-black">
                    <Database className="mr-2 inline-block size-5" />
                    DeepBook Live Pools
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">Real-time orderbook data from DeepBook V3 testnet</p>
                </div>
                <select
                  value={selectedDbPool ?? ""}
                  onChange={(e) => setSelectedDbPool(e.target.value || null)}
                  className="protocol-font rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black shadow-[3px_3px_0_var(--border)] outline-none"
                >
                  {ALL_POOL_KEYS.map((key) => (
                    <option key={key} value={key}>{key.replace("_", "/")}</option>
                  ))}
                </select>
              </div>
            </div>

            {dbPoolInfo && (
              <div className="grid gap-4 p-6 md:grid-cols-4">
                <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="protocol-font mb-1 text-[10px] font-black text-[var(--muted)]">Mid Price</p>
                  <p className="protocol-font text-xl font-black text-[var(--foreground)]">
                    {midPrice > 0 ? midPrice.toFixed(midPrice < 1 ? 6 : 4) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{dbPoolInfo.quoteAsset}/{dbPoolInfo.baseAsset}</p>
                </div>
                <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="protocol-font mb-1 text-[10px] font-black text-[var(--muted)]">Spread</p>
                  <p className={`protocol-font text-xl font-black ${spread < 1 ? "text-[var(--success)]" : "text-[var(--warn)]"}`}>
                    {spread > 0 ? spread.toFixed(3) + "%" : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">Bid-ask spread</p>
                </div>
                <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="protocol-font mb-1 text-[10px] font-black text-[var(--muted)]">Bid Depth</p>
                  <p className="protocol-font text-xl font-black text-[var(--foreground)]">
                    {bidDepth > 0 ? bidDepth.toFixed(2) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{dbPoolInfo.quoteAsset}</p>
                </div>
                <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="protocol-font mb-1 text-[10px] font-black text-[var(--muted)]">Ask Depth</p>
                  <p className="protocol-font text-xl font-black text-[var(--foreground)]">
                    {askDepth > 0 ? askDepth.toFixed(2) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{dbPoolInfo.quoteAsset}</p>
                </div>
              </div>
            )}

            {orderbook && (
              <div className="grid gap-0 border-t-2 border-[var(--border)] md:grid-cols-2">
                <div className="border-b-2 border-[var(--border)] p-4 md:border-b-0 md:border-r-2">
                  <p className="protocol-font mb-3 text-xs font-black text-[var(--success)]">Bids</p>
                  <div className="space-y-1">
                    {orderbook.bids.slice(0, 8).map((level, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs">
                        <span className="font-bold text-[var(--success)]">{level.price.toFixed(dbPoolInfo?.quoteAsset === "DBUSDC" ? 4 : 6)}</span>
                        <span className="text-[var(--muted)]">{level.quantity.toFixed(2)}</span>
                      </div>
                    ))}
                    {orderbook.bids.length === 0 && <p className="text-xs text-[var(--muted)]">No bids</p>}
                  </div>
                </div>
                <div className="p-4">
                  <p className="protocol-font mb-3 text-xs font-black text-[var(--warn)]">Asks</p>
                  <div className="space-y-1">
                    {orderbook.asks.slice(0, 8).map((level, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs">
                        <span className="font-bold text-[var(--warn)]">{level.price.toFixed(dbPoolInfo?.quoteAsset === "DBUSDC" ? 4 : 6)}</span>
                        <span className="text-[var(--muted)]">{level.quantity.toFixed(2)}</span>
                      </div>
                    ))}
                    {orderbook.asks.length === 0 && <p className="text-xs text-[var(--muted)]">No asks</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] shadow-[6px_6px_0_var(--border)]">
            <div className="border-b-2 border-[var(--border)] p-6">
              <h2 className="protocol-font text-lg font-black">Flash Loan Arbitrage Flow</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Atomic yield generation via DeepBook V3 — hot potato pattern guarantees fund safety.
              </p>
            </div>

            <div className="grid gap-0 md:grid-cols-5">
              {YIELD_STEPS.map((step, i) => {
                const isActive = activeStep > i;
                const isCurrent = activeStep === i + 1;
                return (
                  <div
                    key={step.id}
                    className={`relative border-r-0 border-[var(--border)] p-5 transition-all duration-500 last:border-r-0 md:border-r-2 ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/20"
                        : isCurrent
                        ? "bg-sky-50 dark:bg-sky-950/20"
                        : ""
                    }`}
                  >
                    <div className={`mb-2 flex size-10 items-center justify-center rounded-full border-2 text-lg transition-all ${
                      isActive
                        ? "border-teal-500 bg-teal-100 dark:bg-teal-900"
                        : isCurrent
                        ? "border-sky-500 bg-sky-100 dark:bg-sky-900 animate-pulse"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}>
                      {isActive ? "✅" : step.icon}
                    </div>
                    <h3 className={`protocol-font text-sm font-black ${isActive || isCurrent ? "" : "text-[var(--muted)]"}`}>
                      {step.title}
                    </h3>
                    <p className={`mt-1 text-xs leading-relaxed ${isActive || isCurrent ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t-2 border-[var(--border)] p-6">
              <select
                className="protocol-font rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-black shadow-[3px_3px_0_var(--border)] outline-none"
                value={selectedPool ?? ""}
                onChange={(e) => { setSelectedPool(e.target.value || null); setTxStatus("idle"); setActiveStep(0); }}
              >
                <option value="">Select a pool...</option>
                {(poolAddresses ?? []).map((addr) => (
                  <option key={addr} value={addr}>{addr.slice(0, 10)}...{addr.slice(-6)}</option>
                ))}
              </select>

              <button
                onClick={handleSimulateYield}
                disabled={!selectedPool || txStatus === "pending"}
                className="protocol-font inline-flex items-center gap-2 rounded-full border-2 border-[var(--border)] bg-[var(--foreground)] px-6 py-3 text-xs font-black text-[var(--background)] shadow-[4px_4px_0_var(--border)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--border)] disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_var(--border)]"
              >
                {txStatus === "pending" ? "Running..." : "Simulate Flash Arbitrage"}
              </button>
            </div>

            {txStatus === "success" && (
              <div className="border-t-2 border-teal-500 bg-teal-50 p-6 dark:bg-teal-950/20">
                <p className="protocol-font text-sm font-black text-teal-700 dark:text-teal-400">
                  ✅ Yield flow completed — profit deposited to yield_balance
                </p>
                <p className="protocol-font mt-1 text-xs text-[var(--muted)]">{txDigest}</p>
              </div>
            )}

            {txStatus === "error" && (
              <div className="border-t-2 border-red-500 bg-red-50 p-6 dark:bg-red-950/20">
                <p className="protocol-font text-sm font-black text-red-700 dark:text-red-400">
                  ❌ Yield flow failed
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--surface)] shadow-[6px_6px_0_var(--border)]">
            <div className="border-b-2 border-[var(--border)] p-6">
              <h2 className="protocol-font text-lg font-black">Contract Architecture</h2>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b-2 border-[var(--border)] p-6 md:border-b-0 md:border-r-2">
                <h3 className="protocol-font text-sm font-black text-[var(--accent-deep)]">deepbook_yield.move</h3>
                <div className="mt-3 space-y-2">
                  {[
                    { fn: "flash_arbitrage_borrow_base", desc: "Borrow base asset → swap → return → keep profit" },
                    { fn: "flash_arbitrage_borrow_quote", desc: "Borrow quote asset → swap → return → keep profit" },
                    { fn: "deposit_yield_profit_usdc", desc: "Deposit profit coin to pool's yield_balance" },
                    { fn: "deposit_funds_to_deepbook", desc: "Deploy idle pool funds to BalanceManager" },
                    { fn: "withdraw_funds_from_deepbook", desc: "Withdraw from BalanceManager + hot potato receipt" },
                  ].map((item) => (
                    <div key={item.fn} className="rounded-xl border border-[var(--border)] p-3">
                      <p className="protocol-font text-xs font-black">{item.fn}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <h3 className="protocol-font text-sm font-black text-[var(--purple-deep)]">Security Patterns</h3>
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border-2 border-teal-500/30 bg-teal-50 p-4 dark:bg-teal-950/20">
                    <p className="protocol-font text-xs font-black text-teal-700 dark:text-teal-400">Hot Potato Receipt</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      YieldWithdrawalReceipt has no store/copy/drop/key abilities. If not consumed in same PTB, the entire transaction aborts. Same pattern as DeepBook FlashLoan.
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-sky-500/30 bg-sky-50 p-4 dark:bg-sky-950/20">
                    <p className="protocol-font text-xs font-black text-sky-700 dark:text-sky-400">Slippage Protection</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      min_profit parameter ensures tx aborts if arbitrage profit is below threshold. Combined with hot potato, this guarantees no loss scenarios.
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-purple-500/30 bg-purple-50 p-4 dark:bg-purple-950/20">
                    <p className="protocol-font text-xs font-black text-purple-700 dark:text-purple-400">Capability Auth</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      PoolAdminCap required for all yield operations. Only pool admin (or delegate via transfer) can trigger yield generation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
