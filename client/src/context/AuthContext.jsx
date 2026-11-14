import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services';
import { setUnauthorizedHandler, TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [initializing, setInitializing] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const startSession = useCallback(({ token: t, user: u }) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  // Restore the session on page load
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!token) {
      setInitializing(false);
      return;
    }
    let active = true;
    authApi
      .me()
      .then((r) => active && setUser(r.user))
      .catch(() => active && logout())
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => startSession(await authApi.login({ email, password })), [startSession]);
  const register = useCallback(async (body) => startSession(await authApi.register(body)), [startSession]);

  const value = useMemo(
    () => ({ user, token, initializing, isAuthenticated: Boolean(user), login, register, logout, setUser }),
    [user, token, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
