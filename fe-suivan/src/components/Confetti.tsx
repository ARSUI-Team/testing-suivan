"use client";

import { useEffect, useState, useCallback } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  speedRotation: number;
  rounded: boolean;
}

const COLORS = [
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444",
];

interface ConfettiProps {
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}

export default function Confetti({ active, duration = 3000, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const createPieces = useCallback(() => {
    const newPieces: ConfettiPiece[] = [];
    const count = 100;
    for (let i = 0; i < count; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 3,
        speedY: 2 + Math.random() * 3,
        speedRotation: (Math.random() - 0.5) * 10,
        rounded: Math.random() > 0.5,
      });
    }
    return newPieces;
  }, []);

  useEffect(() => {
    if (active && !isAnimating) {
      const startTimer = window.setTimeout(() => {
        setIsAnimating(true);
        setPieces(createPieces());
      }, 0);
      const timer = window.setTimeout(() => {
        setIsAnimating(false);
        setPieces([]);
        onComplete?.();
      }, duration);
      return () => {
        window.clearTimeout(startTimer);
        window.clearTimeout(timer);
      };
    }
  }, [active, duration, isAnimating, createPieces, onComplete]);

  useEffect(() => {
    if (!isAnimating || pieces.length === 0) return;
    const interval = setInterval(() => {
      setPieces((prev) =>
        prev
          .map((piece) => ({
            ...piece,
            x: piece.x + piece.speedX,
            y: piece.y + piece.speedY,
            rotation: piece.rotation + piece.speedRotation,
            speedY: piece.speedY + 0.1,
          }))
          .filter((piece) => piece.y < 110)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [isAnimating, pieces.length]);

  if (!isAnimating) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: piece.rounded ? "50%" : "0%",
          }}
        />
      ))}
    </div>
  );
}

export function SuccessCelebration({
  show,
  title,
  message,
  onClose,
}: {
  show: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = window.setTimeout(() => setShowConfetti(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--surface)] shadow-[8px_8px_0_var(--border)] animate-scale-in">
          <div className="pt-8 pb-4 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-bounce shadow-[4px_4px_0_var(--border)]">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="px-8 pb-8 text-center">
            <h3 className="text-2xl font-black text-[var(--foreground)] mb-2">{title}</h3>
            {message && <p className="text-[var(--muted)] font-semibold">{message}</p>}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl border-2 border-[var(--border)] bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 font-black text-white shadow-[4px_4px_0_var(--border)] transition hover:-translate-y-0.5"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
