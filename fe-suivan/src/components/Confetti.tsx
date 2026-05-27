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
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
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
            speedY: piece.speedY + 0.1, // gravity
          }))
          .filter((piece) => piece.y < 110) // remove pieces that fell off screen
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

// Success celebration component with confetti + message
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
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300">
          {/* Success Icon */}
          <div className="pt-8 pb-4 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            {message && <p className="text-gray-600">{message}</p>}

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
