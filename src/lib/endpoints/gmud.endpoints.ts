export const GMUD_ENDPOINTS = {
  list: "/gmuds",
  create: "/gmuds",
  update: (id: number) => `/gmuds/${id}`,
  remove: (id: number) => `/gmuds/${id}`
} as const;
