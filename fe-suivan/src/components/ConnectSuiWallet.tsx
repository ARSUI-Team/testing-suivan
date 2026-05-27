"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";

interface ConnectSuiWalletProps {
  variant?: "default" | "header";
  scrolled?: boolean;
}

export default function ConnectSuiWallet({ variant = "default", scrolled }: ConnectSuiWalletProps) {
  const account = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const wallets = useWallets();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isHeader = variant === "header";
  const bgConnected = scrolled ? "bg-white" : isHeader ? "bg-white" : "bg-white";
  const bgConnect = scrolled ? "bg-sky-400" : isHeader ? "bg-sky-400" : "bg-sky-400";

  if (account) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`inline-flex items-center gap-2 rounded-full border-2 border-slate-950 px-4 py-2 text-xs font-black shadow-[2px_2px_0_#06111f] transition hover:-translate-y-0.5 ${bgConnected}`}
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="protocol-font">{formatAddress(account.address)}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border-2 border-slate-950 bg-white p-4 shadow-[4px_4px_0_#06111f]">
            <p className="protocol-font truncate text-xs text-slate-500">{account.address}</p>
            <hr className="my-3 border-slate-200" />
            <button
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="w-full rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border-2 border-slate-950 px-4 py-2 text-xs font-black shadow-[2px_2px_0_#06111f] transition hover:-translate-y-0.5 ${bgConnect}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        Connect Wallet
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[1.75rem] border-2 border-slate-950 bg-white p-6 shadow-[8px_8px_0_#06111f]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">Connect Wallet</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm font-semibold text-slate-500">
              Choose a Sui wallet to connect, or use zkLogin
            </p>

            {/* zkLogin — Google */}
            <button
              onClick={() => {
                // zkLogin requires a backend OAuth flow + ephemeral key generation.
                // Integrate with @mysten/zklogin: https://sdk.mystenlabs.com/zklogin
                // Example redirect: window.location.href = `/api/auth/login?provider=google`;
                setIsModalOpen(false);
              }}
              className="mb-3 flex w-full items-center gap-3 rounded-xl border-2 border-slate-950 bg-white p-4 text-left font-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#06111f]"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="flex-1">Continue with Google</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-700">zkLogin</span>
            </button>

            <div className="mb-3 flex items-center gap-3">
              <hr className="flex-1 border-slate-200" />
              <span className="text-xs font-bold text-slate-400">OR</span>
              <hr className="flex-1 border-slate-200" />
            </div>

            {/* Sui Wallets */}
            <div className="space-y-2">
              {wallets.length === 0 && (
                <p className="rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700">
                  No Sui wallet detected. Install{" "}
                  <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" rel="noopener noreferrer" className="underline">
                    Sui Wallet
                  </a>{" "}
                  extension, or use zkLogin above.
                </p>
              )}
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => {
                    connect({ wallet });
                    setIsModalOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 p-3 text-left text-sm font-bold transition hover:border-slate-950 hover:-translate-y-0.5"
                >
                  {wallet.icon && (
                    <img src={wallet.icon} alt={wallet.name} className="h-6 w-6 rounded-full" />
                  )}
                  <span>{wallet.name}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-400">
              By connecting, you agree to the terms of service.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
