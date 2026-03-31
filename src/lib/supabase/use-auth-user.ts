"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    try {
      const supabase = createClient();

      void supabase.auth.getUser().then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setLoading(false);
        }
      });

      const subscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      });

      unsubscribe = () => {
        subscription.data.subscription.unsubscribe();
      };
    } catch {
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}