"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSuccessToast } from "@/components/Toast";

export function useBridgeToDeposit() {
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const queryClient = useQueryClient();
  const successToast = useSuccessToast();

  const openBridgeModal = useCallback(() => setShowBridgeModal(true), []);
  const closeBridgeModal = useCallback(() => setShowBridgeModal(false), []);

  const handleBridgeComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["suivan"] });
    successToast("Balance Updated", "Your wallet balance has been refreshed after bridging");
  }, [queryClient, successToast]);

  return {
    showBridgeModal,
    openBridgeModal,
    closeBridgeModal,
    handleBridgeComplete,
  };
}
