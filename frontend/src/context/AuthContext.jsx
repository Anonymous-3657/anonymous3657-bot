import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { http } from "@/services/api";

const AuthContext = createContext(null);

export const formatApiError = (detail) => {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

export const AuthProvider = ({ children }) => {
  // null = checking, false = signed out, object = signed in
  const [user, setUser] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      const { data } = await http.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } finally {
      setUser(false);
    }
  };

  const value = useMemo(() => ({ user, login, logout, checkSession }), [user, checkSession, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
