"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type SpinnerSize = "fullScreen" | "page" | "inline";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  message?: string;
}

export default function LoadingSpinner({
  size = "fullScreen",
  message = "Loading",
}: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (size !== "fullScreen") return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        const increment = prev < 70 ? 3 : prev < 90 ? 1.5 : 0.5;
        return Math.min(prev + increment, 100);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [size]);

  if (size === "inline") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full overflow-hidden animate-spin">
          <Image
            src="/suivan-logo.jpeg"
            alt=""
            fill
            className="object-cover"
            sizes="20px"
          />
        </span>
        {message && (
          <span className="protocol-font text-xs font-medium uppercase text-[var(--muted)]">
            {message}
          </span>
        )}
      </span>
    );
  }

  if (size === "page") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center justify-center gap-4">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full overflow-hidden animate-spin shadow-[3px_3px_0_var(--border)]">
            <Image
              src="/suivan-logo.jpeg"
              alt="Suivan"
              fill
              className="object-cover"
              sizes="64px"
            />
          </span>
          <p className="protocol-font text-sm font-medium uppercase text-[var(--muted)]">
            {message}
          </p>
        </div>
      </div>
    );
  }

  // fullScreen — original with progress ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[300] min-h-screen w-full flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg
            className="absolute w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="4"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-100 ease-out"
            />
          </svg>

          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] shadow-[3px_3px_0_var(--border)] overflow-hidden">
            <Image
              src="/suivan-logo.jpeg"
              alt="Suivan"
              fill
              className="object-cover"
              sizes="80px"
              priority
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="protocol-font text-2xl font-bold bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            {Math.round(progress)}%
          </p>
          <p className="protocol-font text-sm font-medium uppercase text-[var(--muted)]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
