"use client";

import { useState, useEffect } from "react";

interface SuiFeeProfileProps {
  transactionType?: "join" | "deposit" | "claim";
  showDetailed?: boolean;
}

// Fee profile used to communicate Suivan's sponsored transaction target.
const GAS_ESTIMATES = {
  join: {
    gasUsed: 150000,
    suiFeeEstimate: 0.01,
    ethGasPrice: 5.50, // ~$5.50 per transaction on Ethereum mainnet
  },
  deposit: {
    gasUsed: 80000,
    suiFeeEstimate: 0.01,
    ethGasPrice: 3.20,
  },
  claim: {
    gasUsed: 120000,
    suiFeeEstimate: 0.015,
    ethGasPrice: 4.80,
  },
};

export default function SuiFeeProfile({
  transactionType = "join",
  showDetailed = false,
}: SuiFeeProfileProps) {
  const [animatedSavings, setAnimatedSavings] = useState(0);

  const estimate = GAS_ESTIMATES[transactionType];
  const savings = estimate.ethGasPrice - estimate.suiFeeEstimate;
  const savingsPercent = ((savings / estimate.ethGasPrice) * 100).toFixed(0);

  useEffect(() => {
    // Animate the savings number
    const duration = 1000;
    const steps = 30;
    const increment = savings / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= savings) {
        setAnimatedSavings(savings);
        clearInterval(timer);
      } else {
        setAnimatedSavings(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [savings]);

  if (showDetailed) {
    return (
      <div className="rounded-2xl border-2 border-slate-950 bg-[#d9f8df] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-950 bg-white">
            <svg className="h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-black text-slate-950">Sui Fee Profile</h4>
            <p className="text-xs font-semibold text-slate-500">Low-fee settlement target for Suivan</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl border-2 border-slate-950 bg-white p-3 text-center">
            <p className="protocol-font mb-1 text-xs font-black text-slate-500">ETH</p>
            <p className="protocol-font text-lg font-black text-red-500 line-through">${estimate.ethGasPrice.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-950 bg-white p-3 text-center">
            <p className="protocol-font mb-1 text-xs font-black text-slate-500">SUI</p>
            <p className="protocol-font text-lg font-black text-slate-950">${estimate.suiFeeEstimate.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-950 bg-sky-400 p-3 text-center text-slate-950">
            <p className="protocol-font mb-1 text-xs font-black">SAVE</p>
            <p className="protocol-font text-lg font-black">{savingsPercent}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border-2 border-slate-950 bg-white p-3">
          <span className="protocol-font text-xs font-black text-slate-500">Total Savings</span>
          <span className="protocol-font text-xl font-black text-slate-950">
            ${animatedSavings.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="protocol-font inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-[#d9f8df] px-4 py-2 text-xs font-black text-slate-950">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Save ${savings.toFixed(2)} vs ETH</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs">
        {savingsPercent}% less
      </span>
    </div>
  );
}

// Aggregate savings component for showing total platform savings
export function TotalGasSavings() {
  // Simulated total savings across all users
  const totalSaved = 12450.75;
  const totalTransactions = 2340;

  return (
    <div className="rounded-[1.5rem] border-2 border-slate-950 bg-[#d9f8df] p-6 text-slate-950 shadow-[5px_5px_0_#06111f]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-950 bg-white">
          <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 35L50 20L75 35V65L50 80L25 65V35Z" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h4 className="text-lg font-black">Built for Sui</h4>
          <p className="text-sm font-semibold text-slate-600">Fast settlement, low fees</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-slate-950 bg-white p-4">
          <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Total Gas Saved</p>
          <p className="protocol-font text-2xl font-black">${totalSaved.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-950 bg-white p-4">
          <p className="protocol-font mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Transactions</p>
          <p className="protocol-font text-2xl font-black">{totalTransactions.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-slate-950 pt-4">
        <span className="text-sm font-semibold text-slate-600">Avg savings per tx</span>
        <span className="protocol-font font-black">${(totalSaved / totalTransactions).toFixed(2)}</span>
      </div>
    </div>
  );
}
