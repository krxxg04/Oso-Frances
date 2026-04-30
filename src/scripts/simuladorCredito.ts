import { calcularTIR, calcularVAN, generarCronograma, type Pago } from '../utils/finance';

type TipoGracia = 'total' | 'parcial';

const getRequiredEl = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No se encontró el elemento #${id}`);
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
          <td class="border border-gray-300 px-4 py-2">${pago.mes}</td>
          <td class="border border-gray-300 px-4 py-2">${format(pago.cuota)}</td>
          <td class="border border-gray-300 px-4 py-2">${format(pago.interes)}</td>
          <td class="border border-gray-300 px-4 py-2">${format(pago.amortizacion)}</td>
          <td class="border border-gray-300 px-4 py-2">${format(pago.saldoDeudor)}</td>
        </tr>
      `
    )
    .join('');
};

export default function initSimuladorCredito(): void {
  const form = getRequiredEl<HTMLFormElement>('simulador-form');

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const precioVehiculo = toNumber(precioVehiculoEl);
    const cuotaInicial = toNumber(cuotaInicialEl);
    const plazo = toNumber(plazoEl);
    const tasaNominal = toNumber(tasaNominalEl);
    const frecuenciaCapitalizacion = toNumber(frecuenciaCapitalizacionEl);
    const periodosGracia = toNumber(periodosGraciaEl);
    const tipoGracia = normalizeTipoGracia(tipoGraciaEl.value);

    if (frecuenciaCapitalizacion <= 0) return;

    const capital = precioVehiculo - precioVehiculo * (cuotaInicial / 100);
    const cronograma = generarCronograma(
      capital,
      tasaNominal,
      frecuenciaCapitalizacion,
      plazo,
      periodosGracia,
      tipoGracia
    );

    renderCronograma(cronogramaBodyEl, cronograma);

    const flujos = cronograma.map((pago) => -pago.cuota);
    if (flujos.length > 0) {
      flujos[0] += precioVehiculo * (cuotaInicial / 100);
    }

    const tasaPeriodo = tasaNominal / frecuenciaCapitalizacion;
    const van = calcularVAN(tasaPeriodo, flujos);
    const tir = calcularTIR(flujos);

    vanEl.textContent = format(van);
    tirEl.textContent = `${(tir * 100).toFixed(2)}%`;
  });
}
