import { AUTH_ENDPOINTS } from "./auth.endpoints";
import { GMUD_ENDPOINTS } from "./gmud.endpoints";

export const ENDPOINTS = {
  auth: AUTH_ENDPOINTS,
  gmud: GMUD_ENDPOINTS
} as const;
