const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '')

/** Planner base URL. In development the Vite proxy forwards /api to the local planner. */
export const plannerUrl: string | undefined =
  configured || (import.meta.env.DEV ? '/api' : undefined)
