import {
  calcularTIR,
  calcularVAN,
  generarCronograma,
  tasaEfectivaMensualDesdeTN,
  type Pago,
} from '../utils/finance';
import { API_BASE_URL } from './api';

type TipoGracia = 'total' | 'parcial';


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

const normalizeTipoGracia = (value: string): TipoGracia => (value === 'parcial' ? 'parcial' : 'total');

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
  const tasaNominalEl = getRequiredEl<HTMLInputElement>('tasaNominal');
  const frecuenciaCapitalizacionEl = getRequiredEl<HTMLInputElement>('frecuenciaCapitalizacion');
  const periodosGraciaEl = getRequiredEl<HTMLInputElement>('periodosGracia');
  const tipoGraciaEl = getRequiredEl<HTMLSelectElement>('tipoGracia');

  const cronogramaBodyEl = getRequiredEl<HTMLTableSectionElement>('cronograma-body');
  const vanEl = getRequiredEl<HTMLSpanElement>('valor-van');
  const tirEl = getRequiredEl<HTMLSpanElement>('valor-tir');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const nombreCliente = nombreEl.value.trim();
    const precioVehiculo = toNumber(precioVehiculoEl);
    const cuotaInicial = toNumber(cuotaInicialEl);
    const plazo = Math.max(1, Math.trunc(toNumber(plazoEl)));
    const tasaNominalRaw = toNumber(tasaNominalEl);
    const tasaNominal = tasaNominalRaw > 1 ? tasaNominalRaw / 100 : tasaNominalRaw;
    const frecuenciaCapitalizacion = Math.max(1, Math.trunc(toNumber(frecuenciaCapitalizacionEl)));
    const periodosGracia = Math.max(0, Math.trunc(toNumber(periodosGraciaEl)));
    const tipoGracia = normalizeTipoGracia(tipoGraciaEl.value);

    if (frecuenciaCapitalizacion <= 0) return;
    if (!nombreCliente) return;

    const capital = precioVehiculo - precioVehiculo * (cuotaInicial / 100);
    const gracia = Math.min(plazo, periodosGracia);

    const cronograma = generarCronograma(
      capital,
      tasaNominal,
      frecuenciaCapitalizacion,
      plazo,
      gracia,
      tipoGracia
    );

    renderCronograma(cronogramaBodyEl, cronograma);

    const flujos = [-capital, ...cronograma.map((pago) => pago.cuota)];

    const tasaPeriodo = tasaEfectivaMensualDesdeTN(tasaNominal, frecuenciaCapitalizacion);
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
      tasaNominalAnual: tasaNominal,
      capitalizacionPorAnio: frecuenciaCapitalizacion,
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

