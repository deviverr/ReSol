"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/anchor/program";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(
    () => (wallet ? getProgram(connection, wallet) : null),
    [connection, wallet]
  );
}
