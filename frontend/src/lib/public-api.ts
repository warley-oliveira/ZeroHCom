import axios from "axios"

// Bare axios instance for the PUBLIC customer portal.
//
// Deliberately NOT the shared `@/lib/api` instance: that one injects the org
// user's Bearer token and redirects to /login on 401, which would break a
// page meant for a logged-out customer. Here there is no token and no redirect
// — errors bubble up to TanStack Query / toApiError().
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:23000"

export const publicApi = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})
