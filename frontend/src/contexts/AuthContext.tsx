import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { api } from "@/lib/api"
import {
  clearAuth,
  getToken,
  getUser,
  setToken,
  setUser,
  type StoredUser,
} from "@/lib/auth-storage"

type LoginResponse = {
  token: string
  user: StoredUser
}

type AuthState = {
  user: StoredUser | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(() => getUser())
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>("/api/v1/login", {
      email,
      password,
    })
    setToken(data.token)
    setUser(data.user)
    setTokenState(data.token)
    setUserState(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.delete("/api/v1/logout")
    } catch {
      // Logout is stateless — backend may already have invalidated.
    }
    clearAuth()
    setTokenState(null)
    setUserState(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>")
  }
  return ctx
}
