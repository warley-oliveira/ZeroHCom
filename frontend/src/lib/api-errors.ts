import { AxiosError } from "axios"

export type FieldErrors = Record<string, string[]>

interface ErrorPayload {
  error?: string
  errors?: FieldErrors
}

export interface ApiError {
  status?: number
  code?: string
  fieldErrors?: FieldErrors
  message: string
}

export function toApiError(err: unknown, fallback = "Erro inesperado"): ApiError {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const data = err.response?.data as ErrorPayload | undefined
    const fieldErrors = data?.errors
    const code = data?.error

    return {
      status,
      code,
      fieldErrors,
      message:
        (fieldErrors && Object.values(fieldErrors).flat().join(", ")) ||
        code ||
        err.message ||
        fallback,
    }
  }

  if (err instanceof Error) {
    return { message: err.message }
  }

  return { message: fallback }
}
