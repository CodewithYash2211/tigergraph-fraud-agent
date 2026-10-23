"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_ACTIVITY_LOG,
  INITIAL_CUSTOMER_CARDS,
  INITIAL_CUSTOMER_DEVICES,
  INITIAL_CUSTOMER_NOTIFICATIONS,
  INITIAL_CUSTOMER_PREFERENCES,
  INITIAL_CUSTOMER_PROFILE,
  INITIAL_CUSTOMER_TRANSACTIONS,
  INITIAL_SECURITY_SESSIONS,
  INITIAL_SUPPORT_TICKETS,
  type CustomerActivityItem,
  type CustomerCard,
  type CustomerDevice,
  type CustomerNotification,
  type CustomerPreferences,
  type CustomerProfile,
  type CustomerSupportTicket,
  type CustomerTransaction,
  type SecuritySession,
} from "../mock/customer";
import { useInvestigation } from "./investigation";

interface CustomerState {
  profile: CustomerProfile;
  cards: CustomerCard[];
  devices: CustomerDevice[];
  transactions: CustomerTransaction[];
  securitySessions: SecuritySession[];
  notifications: CustomerNotification[];
  preferences: CustomerPreferences;
  supportTickets: CustomerSupportTicket[];
  activityLog: CustomerActivityItem[];
  passwordLastChanged: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  biometricEnabled: boolean;
  loginAlertsEnabled: boolean;
}

interface CustomerApi extends CustomerState {
  hydrated: boolean;
  updateProfile: (updated: Partial<CustomerProfile>) => void;
  renameCard: (cardId: string, newNickname: string) => void;
  toggleCardLock: (cardId: string) => void;
  setPreferredCard: (cardId: string) => void;
  renameDevice: (deviceId: string, newName: string) => void;
  toggleDeviceTrust: (deviceId: string) => void;
  removeDevice: (deviceId: string) => void;
  changePassword: (currentPass: string, newPass: string) => boolean;
  toggleTwoFactor: (enabled: boolean, method?: string) => void;
  toggleBiometric: (enabled: boolean) => void;
  toggleLoginAlerts: (enabled: boolean) => void;
  signOutSession: (sessionId: string) => void;
  signOutAllOtherSessions: () => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  updatePreferences: (newPrefs: Partial<CustomerPreferences>) => void;
  submitTransactionReport: (
    txnId: string,
    reason: string,
    message: string
  ) => { ticketId: string };
  addActivityItem: (
    action: string,
    detail: string,
    iconType: CustomerActivityItem["iconType"]
  ) => void;
  resetCustomerState: () => void;
}

const initialCustomerState: CustomerState = {
  profile: INITIAL_CUSTOMER_PROFILE,
  cards: INITIAL_CUSTOMER_CARDS,
  devices: INITIAL_CUSTOMER_DEVICES,
  transactions: INITIAL_CUSTOMER_TRANSACTIONS,
  securitySessions: INITIAL_SECURITY_SESSIONS,
  notifications: INITIAL_CUSTOMER_NOTIFICATIONS,
  preferences: INITIAL_CUSTOMER_PREFERENCES,
  supportTickets: INITIAL_SUPPORT_TICKETS,
  activityLog: INITIAL_ACTIVITY_LOG,
  passwordLastChanged: "Oct 12, 2024 (42 days ago)",
  twoFactorEnabled: true,
  twoFactorMethod: "Authenticator App (TOTP)",
  biometricEnabled: true,
  loginAlertsEnabled: true,
};

const KEY = "tg-customer-v1";
const CustomerCtx = createContext<CustomerApi | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomerState>(initialCustomerState);
  const hydrated = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { decision } = useInvestigation();

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        setState({ ...initialCustomerState, ...JSON.parse(raw) });
      }
    } catch {
      /* storage unavailable */
    }
    hydrated.current = true;
    setIsHydrated(true);
  }, []);

  // Persist state changes
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Synchronize card status when Analyst blocks the card via investigation decision
  useEffect(() => {
    if (decision === "approved") {
      setState((prev) => {
        const updatedCards = prev.cards.map((c) =>
          c.id === "C13487-K1" ? { ...c, status: "locked" as const } : c
        );
        return { ...prev, cards: updatedCards };
      });
    }
  }, [decision]);

  const addActivityItem = useCallback(
    (
      action: string,
      detail: string,
      iconType: CustomerActivityItem["iconType"]
    ) => {
      const now = new Date();
      const timeStr = `Today at ${now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const newItem: CustomerActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        action,
        detail,
        timestamp: timeStr,
        iconType,
      };
      setState((prev) => ({
        ...prev,
        activityLog: [newItem, ...prev.activityLog],
      }));
    },
    []
  );

  const updateProfile = useCallback(
    (updated: Partial<CustomerProfile>) => {
      setState((prev) => {
        const nextProfile = { ...prev.profile, ...updated };
        if (updated.firstName || updated.lastName) {
          nextProfile.fullName = `${nextProfile.firstName} ${nextProfile.lastName}`.trim();
        }
        return { ...prev, profile: nextProfile };
      });
      addActivityItem(
        "Profile updated",
        "Personal contact information was modified and saved",
        "profile"
      );
    },
    [addActivityItem]
  );

  const renameCard = useCallback(
    (cardId: string, newNickname: string) => {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === cardId ? { ...c, nickname: newNickname.trim() } : c
        ),
      }));
      addActivityItem(
        "Card renamed",
        `Card ${cardId} nickname changed to "${newNickname.trim()}"`,
        "card"
      );
    },
    [addActivityItem]
  );

  const toggleCardLock = useCallback(
    (cardId: string) => {
      setState((prev) => {
        let newStatus: "active" | "locked" = "active";
        const updated = prev.cards.map((c) => {
          if (c.id === cardId) {
            newStatus = c.status === "active" ? "locked" : "active";
            return { ...c, status: newStatus };
          }
          return c;
        });
        return { ...prev, cards: updated };
      });
      const card = state.cards.find((c) => c.id === cardId);
      const isLocking = card?.status === "active";
      addActivityItem(
        isLocking ? "Card locked" : "Card unlocked",
        `Card •${card?.last4 ?? "card"} was ${
          isLocking ? "temporarily locked" : "unlocked and reactivated"
        }`,
        "card"
      );
    },
    [state.cards, addActivityItem]
  );

  const setPreferredCard = useCallback(
    (cardId: string) => {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => ({
          ...c,
          isPrimary: c.id === cardId,
        })),
      }));
      const card = state.cards.find((c) => c.id === cardId);
      addActivityItem(
        "Default payment card updated",
        `Card •${card?.last4 ?? "card"} is now your preferred payment method`,
        "card"
      );
    },
    [state.cards, addActivityItem]
  );

  const renameDevice = useCallback(
    (deviceId: string, newName: string) => {
      setState((prev) => ({
        ...prev,
        devices: prev.devices.map((d) =>
          d.id === deviceId ? { ...d, name: newName.trim() } : d
        ),
      }));
      addActivityItem(
        "Device renamed",
        `Device name updated to "${newName.trim()}"`,
        "device"
      );
    },
    [addActivityItem]
  );

  const toggleDeviceTrust = useCallback(
    (deviceId: string) => {
      let isTrustedNow = false;
      setState((prev) => ({
        ...prev,
        devices: prev.devices.map((d) => {
          if (d.id === deviceId) {
            isTrustedNow = !d.isTrusted;
            return { ...d, isTrusted: !d.isTrusted };
          }
          return d;
        }),
      }));
      const dev = state.devices.find((d) => d.id === deviceId);
      addActivityItem(
        isTrustedNow ? "Device marked trusted" : "Device trust revoked",
        `${dev?.name ?? "Device"} was ${
          isTrustedNow ? "added to trusted devices" : "marked as untrusted"
        }`,
        "device"
      );
    },
    [state.devices, addActivityItem]
  );

  const removeDevice = useCallback(
    (deviceId: string) => {
      const dev = state.devices.find((d) => d.id === deviceId);
      setState((prev) => ({
        ...prev,
        devices: prev.devices.filter((d) => d.id !== deviceId),
        securitySessions: prev.securitySessions.filter(
          (s) => s.id !== deviceId && !s.deviceName.includes(dev?.name ?? "___")
        ),
      }));
      addActivityItem(
        "Device removed",
        `${dev?.name ?? "Device"} was signed out and removed from account`,
        "device"
      );
    },
    [state.devices, addActivityItem]
  );

  const changePassword = useCallback(
    (currentPass: string, newPass: string) => {
      if (newPass.length < 6) return false;
      const nowStr = `Today (${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })})`;
      setState((prev) => ({
        ...prev,
        passwordLastChanged: nowStr,
      }));
      addActivityItem(
        "Password changed",
        "Your account password was successfully updated",
        "security"
      );
      return true;
    },
    [addActivityItem]
  );

  const toggleTwoFactor = useCallback(
    (enabled: boolean, method = "Authenticator App (TOTP)") => {
      setState((prev) => ({
        ...prev,
        twoFactorEnabled: enabled,
        twoFactorMethod: enabled ? method : "Disabled",
      }));
      addActivityItem(
        enabled ? "Two-step verification enabled" : "Two-step verification disabled",
        enabled
          ? `2FA configured using ${method}`
          : "2FA was disabled on your account",
        "security"
      );
    },
    [addActivityItem]
  );

  const toggleBiometric = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, biometricEnabled: enabled }));
      addActivityItem(
        enabled ? "Biometric login enabled" : "Biometric login disabled",
        enabled
          ? "Passkey and Touch ID/Face ID enabled for this device"
          : "Biometric authentication disabled",
        "security"
      );
    },
    [addActivityItem]
  );

  const toggleLoginAlerts = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, loginAlertsEnabled: enabled }));
      addActivityItem(
        "Security alert settings updated",
        enabled
          ? "Instant alerts for new sign-ins enabled"
          : "Sign-in alerts turned off",
        "security"
      );
    },
    [addActivityItem]
  );

  const signOutSession = useCallback(
    (sessionId: string) => {
      const session = state.securitySessions.find((s) => s.id === sessionId);
      setState((prev) => ({
        ...prev,
        securitySessions: prev.securitySessions.filter((s) => s.id !== sessionId),
      }));
      addActivityItem(
        "Session signed out",
        `Active session on ${session?.deviceName ?? "device"} terminated`,
        "security"
      );
    },
    [state.securitySessions, addActivityItem]
  );

  const signOutAllOtherSessions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      securitySessions: prev.securitySessions.filter((s) => s.isCurrent),
    }));
    addActivityItem(
      "All other sessions signed out",
      "All background sessions across other devices were revoked",
      "security"
    );
  }, [addActivityItem]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== notificationId),
    }));
  }, []);

  const updatePreferences = useCallback(
    (newPrefs: Partial<CustomerPreferences>) => {
      setState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, ...newPrefs },
      }));
      addActivityItem(
        "Preferences updated",
        "Notification and alert delivery preferences modified",
        "profile"
      );
    },
    [addActivityItem]
  );

  const submitTransactionReport = useCallback(
    (txnId: string, reason: string, message: string) => {
      const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTicket: CustomerSupportTicket = {
        id: ticketId,
        txnId: txnId || undefined,
        subject: `Unfamiliar transaction report for TXN #${txnId || "Unknown"}`,
        reason,
        message,
        status: "under_review",
        createdAt: `Today at ${new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        estimatedResponse: "Within 2 hours",
      };
      setState((prev) => ({
        ...prev,
        supportTickets: [newTicket, ...prev.supportTickets],
      }));
      addActivityItem(
        "Transaction dispute submitted",
        `Submitted unfamiliar charge report for TXN #${txnId} (${reason})`,
        "support"
      );
      return { ticketId };
    },
    [addActivityItem]
  );

  const resetCustomerState = useCallback(() => {
    setState(initialCustomerState);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <CustomerCtx.Provider
      value={{
        ...state,
        hydrated: isHydrated,
        updateProfile,
        renameCard,
        toggleCardLock,
        setPreferredCard,
        renameDevice,
        toggleDeviceTrust,
        removeDevice,
        changePassword,
        toggleTwoFactor,
        toggleBiometric,
        toggleLoginAlerts,
        signOutSession,
        signOutAllOtherSessions,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        updatePreferences,
        submitTransactionReport,
        addActivityItem,
        resetCustomerState,
      }}
    >
      {children}
    </CustomerCtx.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerCtx);
  if (!ctx) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return ctx;
}
