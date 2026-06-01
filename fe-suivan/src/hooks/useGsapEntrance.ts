"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export function useGsapEntrance(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const els = container.querySelectorAll<HTMLElement>(".gsap-up");
    if (els.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(els, {
        y: 36,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform",
      });
    }, container);

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
