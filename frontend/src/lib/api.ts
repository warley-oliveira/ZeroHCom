import axios from "axios"

import { clearAuth, getToken } from "@/lib/auth-storage"

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:23000"

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuth()
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.assign("/login")
      }
    }
    return Promise.reject(error)
  },
)
