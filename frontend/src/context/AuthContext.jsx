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

export const errorMessage = (err) =>
  err?.response
    ? formatApiError(err.response.data?.detail)
    : "Network error. Check your connection and try again.";

export const AuthProvider = ({ children }) => {
  // null = checking, false = signed out, object = signed in
  const [user, setUser] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      const { data } = await http.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await http.post("/auth/register", payload);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post("/auth/logout");
    } finally {
      setUser(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await http.put("/auth/profile", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout, updateProfile, checkSession, setUser }),
    [user, login, register, logout, updateProfile, checkSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
