"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  metricsApi,
  UserProfile,
  UserOrganization,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "./api";

interface AuthContextType {
  user: UserProfile | null;
  activeTenantId: string;
  activeOrgName: string;
  activeOrgId: string;
  currentRole: string;
  isViewer: boolean;
  canManageSettings: boolean;
  organizations: UserOrganization[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string, orgName?: string) => Promise<void>;
  logout: () => void;
  switchTenant: (orgId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: "login" | "signup";
  setAuthModalMode: (mode: "login" | "signup") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string>("demo");
  const [activeOrgName, setActiveOrgName] = useState<string>("Demo Organization");
  const [activeOrgId, setActiveOrgId] = useState<string>("default-org");
  const [organizations, setOrganizations] = useState<UserOrganization[]>([
    {
      id: "default-org",
      name: "Demo Organization",
      slug: "demo-org",
      tenant_id: "demo",
      role: "admin",
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const profile = await metricsApi.getMe();
      setUser(profile);
      setActiveTenantId(profile.active_tenant_id);
      setActiveOrgId(profile.active_org_id);
      setOrganizations(profile.organizations || []);

      const activeOrg = profile.organizations?.find(
        (o) => o.id === profile.active_org_id || o.tenant_id === profile.active_tenant_id
      );
      if (activeOrg) {
        setActiveOrgName(activeOrg.name);
      }
    } catch (err) {
      console.warn("Failed to load user profile with existing token, clearing token", err);
      clearStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    const res = await metricsApi.login({ email, password: pass });
    setStoredToken(res.access_token);
    setActiveTenantId(res.active_tenant_id);
    setActiveOrgName(res.active_org_name);
    setActiveOrgId(res.active_org_id);
    await refreshUser();
    setIsAuthModalOpen(false);
  };

  const signup = async (name: string, email: string, pass: string, orgName?: string) => {
    const res = await metricsApi.signup({
      name,
      email,
      password: pass,
      organization_name: orgName,
    });
    setStoredToken(res.access_token);
    setActiveTenantId(res.active_tenant_id);
    setActiveOrgName(res.active_org_name);
    setActiveOrgId(res.active_org_id);
    await refreshUser();
    setIsAuthModalOpen(false);
    // Auto-open onboarding wizard for new signups!
    setIsOnboardingOpen(true);
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    setActiveTenantId("demo");
    setActiveOrgName("Demo Organization");
    setActiveOrgId("default-org");
  };

  const switchTenant = async (orgId: string) => {
    const res = await metricsApi.switchTenant(orgId);
    setStoredToken(res.access_token);
    setActiveTenantId(res.active_tenant_id);
    setActiveOrgName(res.active_org_name);
    setActiveOrgId(res.active_org_id);
    await refreshUser();
  };

  const currentOrg = organizations.find((o) => o.id === activeOrgId || o.tenant_id === activeTenantId);
  const currentRole = currentOrg?.role || user?.organizations?.[0]?.role || "admin";
  const isViewer = currentRole.toLowerCase() === "viewer";
  const canManageSettings = !isViewer;

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenantId,
        activeOrgName,
        activeOrgId,
        currentRole,
        isViewer,
        canManageSettings,
        organizations,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        switchTenant,
        refreshUser,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
