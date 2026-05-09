import {
  calcularTIR,
  calcularVAN,
  generarCronograma,
  tasaEfectivaMensualDesdeTEA,
  type Pago,
} from '../utils/finance';
import { API_BASE_URL } from './api';

type TipoGracia = 'sin_gracia' | 'total' | 'parcial';

type BancoOption = {
  id: string;
  nombre: string;
  tea: number;
  seguroDesgravamenMensual: number;
};

const BANCOS: BancoOption[] = [
  { id: 'bbva', nombre: 'BBVA', tea: 0.14, seguroDesgravamenMensual: 0.0001 },
  { id: 'bcp', nombre: 'BCP', tea: 0.08, seguroDesgravamenMensual: 0.0004 },
  { id: 'interbank', nombre: 'Interbank', tea: 0.112, seguroDesgravamenMensual: 0.00025 },
  { id: 'scotiabank', nombre: 'Scotiabank', tea: 0.125, seguroDesgravamenMensual: 0.0003 },
];

const getRequiredEl = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No se encontro el elemento #${id}`);
  return element as T;
};

const toNumber = (input: HTMLInputElement): number => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
};

const format = (n: number): string => n.toFixed(2);

const normalizeTipoGracia = (value: string): TipoGracia => {
  if (value === 'total') return 'total';
  if (value === 'parcial') return 'parcial';
  return 'sin_gracia';
};

const toPercent = (value: number): string => (value * 100).toFixed(4);

const renderCronograma = (tbody: HTMLTableSectionElement, cronograma: Pago[]) => {
  tbody.innerHTML = cronograma
    .map(
      (pago) => `
        <tr>
          <td class="px-4 py-3 text-left text-slate-700">${pago.mes}</td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-700">${format(pago.cuota)}</td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-700">${format(pago.interes)}</td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-700">${format(pago.amortizacion)}</td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-700">${format(pago.saldoDeudor)}</td>
        </tr>
      `
    )
    .join('');
};

export default function initSimuladorCredito(): void {
  const form = getRequiredEl<HTMLFormElement>('simulador-form');

  const nombreEl = getRequiredEl<HTMLInputElement>('nombre');

  const precioVehiculoEl = getRequiredEl<HTMLInputElement>('precioVehiculo');
  const cuotaInicialEl = getRequiredEl<HTMLInputElement>('cuotaInicial');
  const plazoEl = getRequiredEl<HTMLInputElement>('plazo');
  const bancoEl = getRequiredEl<HTMLSelectElement>('banco');
  const tasaEfectivaAnualEl = getRequiredEl<HTMLInputElement>('tasaEfectivaAnual');
  const seguroDesgravamenEl = getRequiredEl<HTMLInputElement>('seguroDesgravamen');
  const periodosGraciaEl = getRequiredEl<HTMLInputElement>('periodosGracia');
  const tipoGraciaEl = getRequiredEl<HTMLSelectElement>('tipoGracia');

  const cronogramaBodyEl = getRequiredEl<HTMLTableSectionElement>('cronograma-body');
  const vanEl = getRequiredEl<HTMLSpanElement>('valor-van');
  const tirEl = getRequiredEl<HTMLSpanElement>('valor-tir');

  bancoEl.addEventListener('change', () => {
    const selected = BANCOS.find((banco) => banco.id === bancoEl.value);
    if (!selected) return;
    tasaEfectivaAnualEl.value = toPercent(selected.tea);
    seguroDesgravamenEl.value = toPercent(selected.seguroDesgravamenMensual);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const nombreCliente = nombreEl.value.trim();
    const precioVehiculo = toNumber(precioVehiculoEl);
    const cuotaInicial = toNumber(cuotaInicialEl);
    const plazo = Math.max(1, Math.trunc(toNumber(plazoEl)));
    const banco = BANCOS.find((item) => item.id === bancoEl.value) ?? null;
    const tasaEfectivaAnualRaw = toNumber(tasaEfectivaAnualEl);
    const tasaEfectivaAnual =
      tasaEfectivaAnualRaw > 1 ? tasaEfectivaAnualRaw / 100 : tasaEfectivaAnualRaw;
    const seguroDesgravamenRaw = toNumber(seguroDesgravamenEl);
    const seguroDesgravamenMensual =
      seguroDesgravamenRaw > 1 ? seguroDesgravamenRaw / 100 : seguroDesgravamenRaw;
    const periodosGracia = Math.max(0, Math.trunc(toNumber(periodosGraciaEl)));
    const tipoGracia = normalizeTipoGracia(tipoGraciaEl.value);

    if (!nombreCliente) return;
    if (tasaEfectivaAnual < 0 || tasaEfectivaAnual > 0.4) return;
    if (seguroDesgravamenMensual < 0 || seguroDesgravamenMensual > 0.05) return;

    const capital = precioVehiculo - precioVehiculo * (cuotaInicial / 100);
    const gracia = tipoGracia === 'sin_gracia' ? 0 : Math.min(plazo, periodosGracia);

    const cronograma = generarCronograma(capital, tasaEfectivaAnual, plazo, gracia, tipoGracia);

    renderCronograma(cronogramaBodyEl, cronograma);

    const flujos = [-capital, ...cronograma.map((pago) => pago.cuota)];

    const tasaPeriodo = tasaEfectivaMensualDesdeTEA(tasaEfectivaAnual);
    const van = calcularVAN(tasaPeriodo, flujos);
    const tir = calcularTIR(flujos);

    vanEl.textContent = format(van);

    if (Number.isFinite(tir)) {
      tirEl.textContent = `${(tir * 100).toFixed(4)}%`;
    } else {
      tirEl.textContent = '-';
    }

    const payload = {
      nombreCliente,
      precioVehiculo,
      porcentajeCuotaInicial: cuotaInicial,
      plazoMeses: plazo,
      bancoId: banco?.id ?? null,
      bancoNombre: banco?.nombre ?? null,
      tasaEfectivaAnual,
      seguroDesgravamenMensual,
      // Compatibilidad temporal con backend previo.
      tasaNominalAnual: tasaEfectivaAnual,
      capitalizacionPorAnio: 12,
      periodosGracia: gracia,
      tipoGracia,
      result: {
        tasaPeriodo,
        van,
        tir,
        cronograma,
      },
    };

    try {
      await fetch(`${API_BASE_URL}/api/v1/simulaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('No se pudo guardar la simulacion en el backend:', error);
    }
  });
}
