import Dexie, { type Table } from 'dexie';

import type { Pago } from './finance';

export type Cliente = {
  id?: number;
  nombre: string;
  nombreKey: string;
  creadoEn: string;
};

export type SimulacionInput = {
  nombreCliente: string;
  precioVehiculo: number;
  porcentajeCuotaInicial: number;
  plazoMeses: number;
  tasaNominalAnual: number;
  capitalizacionPorAnio: number;
  periodosGracia: number;
  tipoGracia: 'total' | 'parcial';
};

export type SimulacionResult = {
  tasaPeriodo: number;
  van: number;
  tir: number;
  cronograma: Pago[];
};

export type Simulacion = {
  id?: number;
  clienteId: number;
  creadoEn: string;
  input: SimulacionInput;
  result: SimulacionResult;
};

class OsoFrancesDB extends Dexie {
  clientes!: Table<Cliente, number>;
  simulaciones!: Table<Simulacion, number>;

  constructor() {
    super('oso_frances_db_v1');

    this.version(1).stores({
      clientes: '++id,&nombreKey,creadoEn',
      simulaciones: '++id,clienteId,creadoEn',
    });
  }
}

export const db = new OsoFrancesDB();

const normalizeNombre = (nombre: string): { nombre: string; nombreKey: string } => {
  const trimmed = nombre.trim().replace(/\s+/g, ' ');
  return { nombre: trimmed, nombreKey: trimmed.toLowerCase() };
};

export async function getOrCreateCliente(nombre: string): Promise<Cliente> {
  const { nombre: normalized, nombreKey } = normalizeNombre(nombre);
  if (!normalized) throw new Error('Nombre de cliente inválido');

  const existing = await db.clientes.get({ nombreKey });
  if (existing) return existing;

  const creadoEn = new Date().toISOString();
  const id = await db.clientes.add({ nombre: normalized, nombreKey, creadoEn });
  const created = await db.clientes.get(id);
  if (!created) throw new Error('No se pudo crear el cliente');
  return created;
}

export async function guardarSimulacion(input: SimulacionInput, result: SimulacionResult): Promise<number> {
  const cliente = await getOrCreateCliente(input.nombreCliente);
  const creadoEn = new Date().toISOString();

  return db.simulaciones.add({
    clienteId: cliente.id as number,
    creadoEn,
    input,
    result,
  });
}
