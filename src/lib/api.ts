import { ENDPOINTS } from "./endpoints/index";

const DEFAULT_API_BASE_URL = "/api/v1";

function normalizeApiBaseUrl(value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmedValue.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  status: number;
  errorType?: string;

  constructor(message: string, status: number, errorType?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorType = errorType;
  }
}

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationMeta;
};

type ApiErrorResponse = {
  success: false;
  message: string;
  errorType?: string;
};

type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiResultWithMeta<T> = {
  data: T;
  message: string;
  pagination?: PaginationMeta;
};


type RequestConfig = RequestInit & {
  skipJson?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshTokenInFlight: Promise<void> | null = null;

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "success" in payload && typeof (payload as { success?: unknown }).success === "boolean";
}

function parseErrorPayload(payload: unknown, fallbackMessage: string) {
  if (isApiEnvelope<unknown>(payload) && payload.success === false) {
    return {
      message: payload.message || fallbackMessage,
      errorType: payload.errorType
    };
  }

  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { message?: string; error?: string }).message
      ?? (payload as { message?: string; error?: string }).error;

    return {
      message: maybeMessage || fallbackMessage,
      errorType: (payload as { errorType?: string }).errorType
    };
  }

  return { message: fallbackMessage, errorType: undefined };
}

function unwrapApiResponse<T>(payload: unknown, status: number): ApiResultWithMeta<T> {
  if (isApiEnvelope<T>(payload)) {
    if (payload.success === false) {
      throw new ApiError(payload.message || "Falha na requisição", status, payload.errorType);
    }

    return {
      data: payload.data,
      message: payload.message,
      pagination: payload.pagination
    };
  }

  return {
    data: payload as T,
    message: "OK"
  };
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const parsed = await apiRequestWithMeta<T>(path, config);
  return parsed.data;
}

export async function apiRequestWithMeta<T>(path: string, config: RequestConfig = {}): Promise<ApiResultWithMeta<T>> {
  return requestWithAutoRefresh<T>(path, config, false);
}

function isRefreshExcludedPath(path: string) {
  return path.startsWith(ENDPOINTS.auth.login)
    || path.startsWith(ENDPOINTS.auth.refresh)
    || path.startsWith(ENDPOINTS.auth.logout);
}

async function refreshAccessToken() {
  if (!refreshTokenInFlight) {
    refreshTokenInFlight = (async () => {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.refresh}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const fallbackMessage = response.statusText || "Sessão expirada";
        let errorPayload: unknown;

        try {
          errorPayload = await response.json();
        } catch {
          errorPayload = undefined;
        }

        const { message, errorType } = parseErrorPayload(errorPayload, fallbackMessage);
        throw new ApiError(message, response.status, errorType);
      }
    })().finally(() => {
      refreshTokenInFlight = null;
    });
  }

  return refreshTokenInFlight;
}

async function requestWithAutoRefresh<T>(
  path: string,
  config: RequestConfig,
  hasRetried: boolean
): Promise<ApiResultWithMeta<T>> {
  const {
    skipJson = false,
    retryOnUnauthorized = true,
    headers,
    ...rest
  } = config;

  const normalizedHeaders = new Headers(headers);
  const hasBody = rest.body !== undefined && rest.body !== null;

  if (hasBody && !normalizedHeaders.has("Content-Type")) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: normalizedHeaders,
    ...rest
  });

  if (!response.ok) {
    if (
      response.status === 401
      && retryOnUnauthorized
      && !hasRetried
      && !isRefreshExcludedPath(path)
    ) {
      try {
        await refreshAccessToken();
      } catch (refreshError) {
        if (
          refreshError instanceof ApiError
          && (refreshError.status === 401 || refreshError.status === 403)
        ) {
          redirectToLogin();
        }

        throw refreshError;
      }

      return requestWithAutoRefresh<T>(path, config, true);
    }

    const fallbackMessage = response.statusText || "Falha na requisição";
    let errorPayload: unknown;

    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = undefined;
    }

    const { message, errorType } = parseErrorPayload(errorPayload, fallbackMessage);

    throw new ApiError(message, response.status, errorType);
  }

  if (skipJson || response.status === 204) {
    return { data: undefined as T, message: "Operação realizada" };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return { data: undefined as T, message: "Operação realizada" };
  }

  return unwrapApiResponse<T>(payload, response.status);
}

export type AuthUser = {
  id?: number | string;
  nome?: string;
  usuario?: string;
  username?: string;
  email?: string;
  role?: string;
  perfil?: string;
};

export async function login(username: string, password: string) {
  return apiRequest<AuthUser>(ENDPOINTS.auth.login, {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function logout() {
  return apiRequest<void>(ENDPOINTS.auth.logout, {
    method: "POST",
    skipJson: true
  });
}

export async function getMe() {
  return apiRequest<AuthUser>(ENDPOINTS.auth.me);
}

export type GmudStatus = "Concluida" | "Pendente" | "Cancelada";

type BackendGmudStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

type BackendGmudItem = {
  id: number;
  title: string;
  projectId: string;
  spring: string;
  gmudType: string;
  gmudNumber: string;
  developer: string;
  approver: string;
  status: BackendGmudStatus;
};

type BackendCreateOrUpdateGmudPayload = {
  title: string;
  projectId: string;
  spring: string;
  gmudType: string;
  gmudNumber: string;
  developer: string;
  approver: string;
  status?: BackendGmudStatus;
};

export type GmudItem = {
  id: number;
  nomeProjeto: string;
  numeroProjeto: string;
  sprint: string;
  gmudNumber: string;
  status: GmudStatus;
  tipoProjeto: string;
  desenvolvedorNova: string;
  responsavelBrasilis: string;
};

export type CreateGmudPayload = Omit<GmudItem, "id">;

type GmudListResponse = BackendGmudItem[] | { data?: BackendGmudItem[]; items?: BackendGmudItem[] };

export type GmudListParams = {
  page?: number;
  limit?: number;
  status?: string;
  projectId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type GmudListPaginatedResult = {
  items: GmudItem[];
  pagination: PaginationMeta;
};

function normalizeGmudListPayload(payload: GmudListResponse) {
  const toFrontStatus = (status: BackendGmudStatus): GmudStatus => {
    if (status === "completed") {
      return "Concluida";
    }

    if (status === "cancelled") {
      return "Cancelada";
    }

    return "Pendente";
  };

  const toFrontItem = (item: BackendGmudItem): GmudItem => ({
    id: item.id,
    nomeProjeto: item.title,
    numeroProjeto: item.projectId,
    sprint: item.spring,
    gmudNumber: item.gmudNumber,
    status: toFrontStatus(item.status),
    tipoProjeto: item.gmudType,
    desenvolvedorNova: item.developer,
    responsavelBrasilis: item.approver
  });

  if (Array.isArray(payload)) {
    return payload.map(toFrontItem);
  }

  return (payload.data ?? payload.items ?? []).map(toFrontItem);
}

function toBackendStatus(status: GmudStatus): BackendGmudStatus {
  if (status === "Concluida") {
    return "completed";
  }

  if (status === "Cancelada") {
    return "cancelled";
  }

  return "scheduled";
}

function toBackendCreateOrUpdatePayload(body: CreateGmudPayload): BackendCreateOrUpdateGmudPayload {
  return {
    title: body.nomeProjeto,
    projectId: body.numeroProjeto,
    spring: body.sprint,
    gmudType: body.tipoProjeto,
    gmudNumber: body.gmudNumber,
    developer: body.desenvolvedorNova,
    approver: body.responsavelBrasilis,
    status: toBackendStatus(body.status)
  };
}

function buildListGmudsPath(params?: GmudListParams) {
  if (!params) {
    return ENDPOINTS.gmud.list;
  }

  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.status && params.status.trim().length > 0) {
    searchParams.set("status", params.status);
  }

  if (params.projectId && params.projectId.trim().length > 0) {
    searchParams.set("projectId", params.projectId);
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortOrder) {
    searchParams.set("sortOrder", params.sortOrder);
  }

  const queryString = searchParams.toString();
  return queryString ? `${ENDPOINTS.gmud.list}?${queryString}` : ENDPOINTS.gmud.list;
}

export async function listGmuds() {
  const payload = await apiRequest<GmudListResponse>(ENDPOINTS.gmud.list);
  return normalizeGmudListPayload(payload);
}

export async function listGmudsPaginated(params: GmudListParams = {}): Promise<GmudListPaginatedResult> {
  const requestedPage = params.page ?? 1;
  const requestedLimit = params.limit ?? 10;
  const path = buildListGmudsPath({
    page: requestedPage,
    limit: requestedLimit,
    status: params.status,
    projectId: params.projectId,
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc"
  });
  const response = await apiRequestWithMeta<GmudListResponse>(path);
  const items = normalizeGmudListPayload(response.data);

  return {
    items,
    pagination: response.pagination ?? {
      page: requestedPage,
      limit: requestedLimit,
      totalItems: items.length,
      totalPages: 1
    }
  };
}

export async function createGmud(body: CreateGmudPayload) {
  const payload = toBackendCreateOrUpdatePayload(body);
  const response = await apiRequest<BackendGmudItem>(ENDPOINTS.gmud.create, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return normalizeGmudListPayload([response])[0];
}

export async function updateGmud(id: number, body: CreateGmudPayload) {
  const payload = toBackendCreateOrUpdatePayload(body);
  const response = await apiRequest<BackendGmudItem>(ENDPOINTS.gmud.update(id), {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  return normalizeGmudListPayload([response])[0];
}

export async function deleteGmud(id: number) {
  return apiRequest<void>(ENDPOINTS.gmud.remove(id), {
    method: "DELETE",
    skipJson: true
  });
}
