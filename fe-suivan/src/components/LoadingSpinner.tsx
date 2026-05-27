"use client";

import { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingSpinner({ 
  fullScreen = false, 
  message = "Loading" 
}: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        // Smooth progress that slows down near the end
        const increment = prev < 70 ? 3 : prev < 90 ? 1.5 : 0.5;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Calculate stroke-dasharray for progress ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`${fullScreen ? "fixed inset-0 z-[300]" : ""} min-h-screen w-full flex items-center justify-center bg-white`}>
      {/* Main Loading Content */}
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Logo with Progress Ring */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* SVG Progress Ring */}
          <svg 
            className="absolute w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Background Circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="4"
            />
            {/* Progress Circle with Gradient */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-100 ease-out"
            />
          </svg>

          {/* Logo Container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-sky-500 text-3xl font-black text-white shadow-sm animate-pulse-subtle">
            S
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="text-center space-y-2">
          <p 
            className="protocol-font text-2xl font-bold bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent"
          >
            {Math.round(progress)}%
          </p>
          <p 
            className="protocol-font text-sm font-medium uppercase text-gray-500"
          >
            {message}
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.85; 
            transform: scale(0.98);
          }
        }

        :global(.animate-pulse-subtle) {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
