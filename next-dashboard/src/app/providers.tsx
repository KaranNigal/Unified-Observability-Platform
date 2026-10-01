"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModal } from "./components/AuthModal";
import { OnboardingWizard } from "./components/OnboardingWizard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
      <OnboardingWizard />
    </AuthProvider>
  );
}
