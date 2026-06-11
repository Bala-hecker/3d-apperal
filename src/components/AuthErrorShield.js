"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthErrorShield() {
  useEffect(() => {
    // 1. Intercept global unhandled promise rejections related to stale Supabase tokens
    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      const errorMsg = reason?.message || String(reason || "");
      
      if (
        errorMsg.includes("Refresh Token Not Found") || 
        errorMsg.includes("Invalid Refresh Token")
      ) {
        console.warn("AuthErrorShield: Caught invalid Supabase refresh token. Clearing local auth storage...");
        
        // Prevent dev-server/Turbopack error overlay from interrupting
        event.preventDefault();
        
        // Clear all Supabase related keys in localStorage
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith("sb-")) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error("Storage clear failed:", e);
        }

        // Silent sign out to clear SDK state and reload page
        supabase.auth.signOut().finally(() => {
          window.location.reload();
        });
      }
    };

    // 2. Perform a proactive session check to catch stale token errors on mount
    const checkActiveSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error && (
          error.message?.includes("Refresh Token Not Found") || 
          error.message?.includes("Invalid Refresh Token")
        )) {
          console.warn("AuthErrorShield: Proactive check caught invalid refresh token. Cleaning storage...");
          
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith("sb-")) {
              localStorage.removeItem(key);
            }
          }
          
          await supabase.auth.signOut();
          window.location.reload();
        }
      } catch (err) {
        console.warn("AuthErrorShield: Proactive check exception:", err);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    checkActiveSession();

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
