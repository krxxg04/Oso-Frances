export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)?.trim() ||
  'https://backend-oso-frances.onrender.com';

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string } | string>;
  details?: string | Array<{ msg?: string; field?: string } | string>;
  message?: string;
  error?: string | { code?: string; message?: string; field?: string };
  errors?:
    | string[]
    | Array<{ field?: string; message?: string; msg?: string }>
    | Record<string, string | string[] | { message?: string; msg?: string }>;
  violations?: Array<{ field?: string; message?: string; msg?: string }>;
};

export type UserSession = {
  authenticated: boolean;
  user?: {
    username: string;
  };
};

export type ClienteProfile = {
  username: string;
  email: string;
  dni: string;
  fullName: string;
  pictureUrl?: string;
  role: string;
};

export type Banco = {
  id: string;
  nombre: string;
  producto: string;
  moneda: string;
  tasaEfectivaAnual: number;
  seguroDesgravamenMensual: number;
  seguroDesgravamenAnual: number;
  montoMin: number;
  porcentajeCuotaInicialMin: number;
  porcentajeCuotaInicialMax: number;
  plazosMeses: number[];
  periodosGraciaMax: number;
};

export type Vehiculo = {
  id?: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo: string;
  precio: number;
  moneda: string;
};

export type TipoGracia = 'sin_gracia' | 'parcial' | 'total';
export type TipoTasa = 'efectiva' | 'nominal';

export type SimulationCreatePayload = {
  bancoId?: string;
  moneda: string;
  vehiculo: Vehiculo;
  porcentajeCuotaInicial: number;
  plazoMeses: number;
  periodosPorAnio: number;
  periodosGracia: number;
  tipoGracia: TipoGracia;
  cuotaFinalBalloon: number;
  seguroVehicularMensual: number;
  fechaInicio: string;
  tipoTasa?: TipoTasa;
  tasaAnual?: number;
  tasaEfectivaAnual?: number;
  frecuenciaCapitalizacion?: number;
  seguroDesgravamenAnual?: number;
};

export type SimulationFilters = {
  moneda?: string;
  plazoMeses?: number;
  vehiculo?: string;
  montoMin?: number;
  montoMax?: number;
  fechaDesde?: string;
  fechaHasta?: string;
};

export type SimulationResult = {
  id?: string;
  banco?: Banco;
  tasa?: {
    tasaEfectivaAnual: number;
  };
  tasaPeriodo?: number;
  result?: {
    tasa?: {
      tasaEfectivaAnual: number;
    };
    tasaPeriodo?: number;
    resumen?: {
      montoFinanciado: number;
      cuotaInicial: number;
      cuotaMensual: number;
      cuotaFinalBalloon: number;
      totalIntereses: number;
      totalSeguros: number;
      totalPagado: number;
      tcea: number;
      van: number;
      tir: number;
      fechaFinalizacion: string;
    };
    cronograma?: Array<{
      mes: number;
      fecha: string;
      saldoInicial: number;
      cuota: number;
      cuotaCapitalInteres: number;
      interes: number;
      seguroVehicular: number;
      seguroDesgravamen: number;
      seguro: number;
      amortizacion: number;
      saldoFinal: number;
      tipoGracia: string;
    }>;
  };
};

const buildErrorMessage = (status: number, payload: unknown, fallback: string): string => {
  const data = payload as ApiErrorPayload | null;
  const joinMessages = (messages: string[]): string | null => {
    const clean = messages.map((item) => item.trim()).filter(Boolean);
    return clean.length ? clean.join(' | ') : null;
  };

  const collectEntryMessage = (entry: unknown): string | null => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return null;

    const obj = entry as { field?: string; message?: string; msg?: string };
    const message = obj.message ?? obj.msg;
    if (!message) return null;
    return obj.field ? `${obj.field}: ${message}` : message;
  };

  if (Array.isArray(data?.detail)) {
    const combined = joinMessages(data.detail.map((item) => collectEntryMessage(item) ?? ''));
    if (combined) return combined;
  }

  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.details)) {
    const combined = joinMessages(data.details.map((item) => collectEntryMessage(item) ?? ''));
    if (combined) return combined;
  }
  if (typeof data?.details === 'string') return data.details;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.error === 'object' && typeof data.error?.message === 'string') return data.error.message;

  if (Array.isArray(data?.violations)) {
    const combined = joinMessages(data.violations.map((item) => collectEntryMessage(item) ?? ''));
    if (combined) return combined;
  }

  if (Array.isArray(data?.errors)) {
    const combined = joinMessages(data.errors.map((item) => collectEntryMessage(item) ?? ''));
    if (combined) return combined;
  }

  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const entries = Object.entries(data.errors).flatMap(([field, value]) => {
      if (typeof value === 'string') return [`${field}: ${value}`];
      if (Array.isArray(value)) return value.map((item) => `${field}: ${item}`);
      if (value && typeof value === 'object') {
        const nestedMessage =
          ('message' in value && typeof value.message === 'string' && value.message) ||
          ('msg' in value && typeof value.msg === 'string' && value.msg) ||
          '';
        return nestedMessage ? [`${field}: ${nestedMessage}`] : [];
      }
      return [];
    });
    const combined = joinMessages(entries);
    if (combined) return combined;
  }

  if (payload && typeof payload === 'object') {
    return `${fallback} (HTTP ${status}) - ${JSON.stringify(payload)}`;
  }

  return `${fallback} (HTTP ${status})`;
};

const safePayload = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text ? { message: text } : null;
    } catch {
      return null;
    }
  }
};

async function request<T>(path: string, init?: RequestInit, fallbackError = 'Error de API'): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = await safePayload(response);

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload, fallbackError));
  }

  return (payload as T) ?? ({} as T);
}

export async function register(body: {
  username: string;
  gmail: string;
  dni: string;
  fullName: string;
  password: string;
  repeatPassword: string;
}) {
  return request<{ user: { username: string; gmail: string; dni: string; fullName: string } }>(
    '/api/v1/auth/register',
    { method: 'POST', body: JSON.stringify(body) },
    'No se pudo registrar'
  );
}

export async function login(body: { username: string; password: string }) {
  return request<{ user: { username: string } }>(
    '/api/v1/auth/login',
    { method: 'POST', body: JSON.stringify(body) },
    'No se pudo iniciar sesion'
  );
}

export async function logout() {
  return request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' }, 'No se pudo cerrar sesion');
}

export async function getSession() {
  return request<UserSession>('/api/v1/auth/session', { method: 'GET' }, 'No se pudo verificar sesion');
}

export async function getProfile() {
  return request<ClienteProfile>('/api/v1/clientes/me', { method: 'GET' }, 'No se pudo obtener perfil');
}

export async function getBanks() {
  return request<{ items: Banco[] }>('/api/v1/bancos', { method: 'GET' }, 'No se pudo cargar bancos');
}

export async function createVehicle(body: Vehiculo) {
  return request<{ item?: Vehiculo }>(
    '/api/v1/vehiculos',
    { method: 'POST', body: JSON.stringify(body) },
    'No se pudo registrar vehiculo'
  );
}

export async function getVehicles() {
  return request<{ items: Vehiculo[] }>('/api/v1/vehiculos', { method: 'GET' }, 'No se pudo cargar vehiculos');
}

export async function getVehicleById(id: string) {
  return request<Vehiculo>(`/api/v1/vehiculos/${id}`, { method: 'GET' }, 'No se pudo obtener vehiculo');
}

export async function createSimulation(body: SimulationCreatePayload) {
  return request<SimulationResult>(
    '/api/v1/simulaciones',
    { method: 'POST', body: JSON.stringify(body) },
    'No se pudo crear simulacion'
  );
}

const toQuery = (filters: SimulationFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export async function getSimulations(filters: SimulationFilters = {}) {
  return request<{ items: SimulationResult[] }>(
    `/api/v1/simulaciones${toQuery(filters)}`,
    { method: 'GET' },
    'No se pudo cargar historial'
  );
}

export async function getSimulationById(id: string) {
  return request<SimulationResult>(`/api/v1/simulaciones/${id}`, { method: 'GET' }, 'No se pudo obtener simulacion');
}
