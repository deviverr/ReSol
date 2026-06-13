"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabaseClient";

interface AuthState {
  /** Connected wallet address (base58), or null. */
  wallet: string | null;
  /** True once the wallet has an active Supabase session (RLS works). */
  authed: boolean;
  signingIn: boolean;
}

const AuthContext = createContext<AuthState>({
  wallet: null,
  authed: false,
  signingIn: false,
});

export const useAuth = () => useContext(AuthContext);

const LS_KEY = "resol_authed_wallet";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const [authedWallet, setAuthedWallet] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const attempted = useRef<string | null>(null);

  const wallet = publicKey?.toBase58() ?? null;

  // Restore a persisted session on first load.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (data.session && stored) setAuthedWallet(stored);
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (!wallet || !signMessage) return;
    setSigningIn(true);
    try {
      const { data } = await supabase.auth.getSession();
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (data.session && stored === wallet) {
        setAuthedWallet(wallet);
        return;
      }
      const { error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement: "Sign in to Resol — secure, local, secondhand trading.",
        wallet: {
          publicKey: { toBase58: () => wallet },
          signMessage: (msg: Uint8Array) => signMessage(msg),
        },
      });
      if (!error) {
        localStorage.setItem(LS_KEY, wallet);
        setAuthedWallet(wallet);
      } else {
        console.error("signInWithWeb3 failed", error);
      }
    } finally {
      setSigningIn(false);
    }
  }, [wallet, signMessage]);

  // Sign in whenever a new wallet connects.
  useEffect(() => {
    if (!wallet || !signMessage) return;
    if (authedWallet === wallet) return;
    if (attempted.current === wallet) return;
    attempted.current = wallet;
    void signIn();
  }, [wallet, signMessage, authedWallet, signIn]);

  // Sign out on disconnect.
  useEffect(() => {
    if (!connected && authedWallet) {
      queueMicrotask(() => {
        supabase.auth.signOut();
        localStorage.removeItem(LS_KEY);
        setAuthedWallet(null);
        attempted.current = null;
      });
    }
  }, [connected, authedWallet]);

  return (
    <AuthContext.Provider
      value={{ wallet, authed: authedWallet === wallet && !!wallet, signingIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}
