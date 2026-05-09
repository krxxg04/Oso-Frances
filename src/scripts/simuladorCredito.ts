import {
  createSimulation,
  createVehicle,
  getBanks,
  getSimulationById,
  getSimulations,
  getVehicles,
  type Banco,
  type SimulationCreatePayload,
  type SimulationResult,
  type TipoGracia,
  type Vehiculo,
} from '../services/api';

const getRequiredEl = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No se encontro el elemento #${id}`);
  return element as T;
};

const money = (value: number, currency: string): string =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const pct = (value: number): string => `${(Number(value) || 0).toFixed(4)}%`;

const toNumber = (input: HTMLInputElement): number => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
};

const setMessage = (el: HTMLElement, message: string, hidden: boolean) => {
  el.textContent = message;
  el.classList.toggle('hidden', hidden);
};

export default function initSimuladorCredito(): void {
  const form = getRequiredEl<HTMLFormElement>('simulador-form');
  const errorEl = getRequiredEl<HTMLParagraphElement>('simulador-error');
  const okEl = getRequiredEl<HTMLParagraphElement>('simulador-ok');

  const vehiculoIdEl = getRequiredEl<HTMLSelectElement>('vehiculoId');
  const marcaEl = getRequiredEl<HTMLInputElement>('marca');
  const modeloEl = getRequiredEl<HTMLInputElement>('modelo');
  const anioEl = getRequiredEl<HTMLInputElement>('anio');
  const tipoEl = getRequiredEl<HTMLInputElement>('tipo');
  const btnRegistrarVehiculoEl = getRequiredEl<HTMLButtonElement>('btn-registrar-vehiculo');

  const monedaEl = getRequiredEl<HTMLSelectElement>('moneda');
  const precioVehiculoEl = getRequiredEl<HTMLInputElement>('precioVehiculo');
  const bancoIdEl = getRequiredEl<HTMLSelectElement>('bancoId');
  const porcentajeCuotaInicialEl = getRequiredEl<HTMLInputElement>('porcentajeCuotaInicial');
  const plazoMesesEl = getRequiredEl<HTMLSelectElement>('plazoMeses');
  const tipoGraciaEl = getRequiredEl<HTMLSelectElement>('tipoGracia');
  const periodosGraciaEl = getRequiredEl<HTMLInputElement>('periodosGracia');
  const cuotaFinalBalloonEl = getRequiredEl<HTMLInputElement>('cuotaFinalBalloon');
  const seguroVehicularMensualEl = getRequiredEl<HTMLInputElement>('seguroVehicularMensual');
  const fechaInicioEl = getRequiredEl<HTMLInputElement>('fechaInicio');

  const bancoInfoWrapEl = getRequiredEl<HTMLDivElement>('banco-info');
  const bancoInfoTextEl = getRequiredEl<HTMLParagraphElement>('banco-info-text');

  const manualRateFieldsEl = getRequiredEl<HTMLDivElement>('manual-rate-fields');
  const tasaEfectivaAnualEl = getRequiredEl<HTMLInputElement>('tasaEfectivaAnual');
  const seguroDesgravamenAnualEl = getRequiredEl<HTMLInputElement>('seguroDesgravamenAnual');

  const resumenGridEl = getRequiredEl<HTMLDivElement>('resumen-grid');
  const bancoResultCardEl = getRequiredEl<HTMLDivElement>('banco-result-card');
  const bancoResultadoEl = getRequiredEl<HTMLParagraphElement>('banco-resultado');
  const cronogramaBodyEl = getRequiredEl<HTMLTableSectionElement>('cronograma-body');

  const historialFormEl = getRequiredEl<HTMLFormElement>('historial-filtros');
  const historialBodyEl = getRequiredEl<HTMLTableSectionElement>('historial-body');
  const fMonedaEl = getRequiredEl<HTMLInputElement>('f-moneda');
  const fPlazoEl = getRequiredEl<HTMLInputElement>('f-plazo');
  const fVehiculoEl = getRequiredEl<HTMLInputElement>('f-vehiculo');
  const fMontoMinEl = getRequiredEl<HTMLInputElement>('f-monto-min');
  const fMontoMaxEl = getRequiredEl<HTMLInputElement>('f-monto-max');
  const fFechaDesdeEl = getRequiredEl<HTMLInputElement>('f-fecha-desde');
  const fFechaHastaEl = getRequiredEl<HTMLInputElement>('f-fecha-hasta');

  let bancos: Banco[] = [];
  let vehiculos: Vehiculo[] = [];

  const renderPlazos = (plazos: number[]) => {
    const unique = [...new Set(plazos)].sort((a, b) => a - b);
    const options = unique.length > 0 ? unique : [12, 24, 36, 48, 60];
    plazoMesesEl.innerHTML = options.map((plazo) => `<option value="${plazo}">${plazo}</option>`).join('');
  };

  const updateManualRateVisibility = () => {
    const hasBank = !!bancoIdEl.value;
    manualRateFieldsEl.classList.toggle('hidden', hasBank);
  };

  const renderBankInfo = (bank: Banco | null) => {
    if (!bank) {
      bancoInfoWrapEl.classList.add('hidden');
      bancoInfoTextEl.textContent = '';
      return;
    }

    bancoInfoWrapEl.classList.remove('hidden');
    tasaEfectivaAnualEl.value = String(bank.tasaEfectivaAnual);
    seguroDesgravamenAnualEl.value = String(bank.seguroDesgravamenAnual);
    bancoInfoTextEl.textContent = `${bank.nombre} · ${bank.producto} · TEA ${pct(bank.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pct(bank.seguroDesgravamenMensual)}`;
  };

  const applyBankConstraints = (bank: Banco | null) => {
    if (!bank) {
      porcentajeCuotaInicialEl.min = '0';
      porcentajeCuotaInicialEl.max = '100';
      periodosGraciaEl.max = '120';
      renderPlazos([12, 24, 36, 48, 60]);
      return;
    }

    porcentajeCuotaInicialEl.min = String(bank.porcentajeCuotaInicialMin);
    porcentajeCuotaInicialEl.max = String(bank.porcentajeCuotaInicialMax);
    if (Number(porcentajeCuotaInicialEl.value) < bank.porcentajeCuotaInicialMin) {
      porcentajeCuotaInicialEl.value = String(bank.porcentajeCuotaInicialMin);
    }
    if (Number(porcentajeCuotaInicialEl.value) > bank.porcentajeCuotaInicialMax) {
      porcentajeCuotaInicialEl.value = String(bank.porcentajeCuotaInicialMax);
    }

    periodosGraciaEl.max = String(bank.periodosGraciaMax);
    if (Number(periodosGraciaEl.value) > bank.periodosGraciaMax) {
      periodosGraciaEl.value = String(bank.periodosGraciaMax);
    }

    renderPlazos(bank.plazosMeses || []);
  };

  const getSelectedBank = (): Banco | null => bancos.find((item) => item.id === bancoIdEl.value) ?? null;

  const renderResumen = (result: SimulationResult, currency: string) => {
    const resumen = result.resumen;
    if (!resumen) {
      resumenGridEl.innerHTML = '';
      return;
    }

    const items: Array<[string, string]> = [
      ['TEA', pct(result.tasa?.tasaEfectivaAnual ?? 0)],
      ['Tasa periodo', pct(result.tasaPeriodo ?? 0)],
      ['Monto financiado', money(resumen.montoFinanciado, currency)],
      ['Cuota inicial', money(resumen.cuotaInicial, currency)],
      ['Cuota mensual', money(resumen.cuotaMensual, currency)],
      ['Cuota final balloon', money(resumen.cuotaFinalBalloon, currency)],
      ['Total intereses', money(resumen.totalIntereses, currency)],
      ['Total seguros', money(resumen.totalSeguros, currency)],
      ['Total pagado', money(resumen.totalPagado, currency)],
      ['TCEA', pct(resumen.tcea)],
      ['VAN', money(resumen.van, currency)],
      ['TIR', pct(resumen.tir)],
      ['Fecha finalización', resumen.fechaFinalizacion || '-'],
    ];

    resumenGridEl.innerHTML = items
      .map(
        ([label, value]) => `
        <div class="stat-card">
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
        </div>
      `
      )
      .join('');
  };

  const renderBancoResult = (result: SimulationResult) => {
    if (!result.banco) {
      bancoResultCardEl.classList.add('hidden');
      bancoResultadoEl.textContent = '';
      return;
    }

    bancoResultCardEl.classList.remove('hidden');
    bancoResultadoEl.textContent = `${result.banco.nombre} · ${result.banco.producto} · TEA ${pct(result.banco.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pct(result.banco.seguroDesgravamenMensual)} · Seguro desgravamen anual ${pct(result.banco.seguroDesgravamenAnual)}`;
  };

  const renderCronograma = (result: SimulationResult, currency: string) => {
    const cronograma = result.cronograma || [];
    cronogramaBodyEl.innerHTML = cronograma
      .map(
        (row) => `
        <tr>
          <td>${row.mes ?? '-'}</td>
          <td>${row.fecha ?? '-'}</td>
          <td>${money(row.saldoInicial ?? 0, currency)}</td>
          <td>${money(row.cuota ?? 0, currency)}</td>
          <td>${money(row.cuotaCapitalInteres ?? 0, currency)}</td>
          <td>${money(row.interes ?? 0, currency)}</td>
          <td>${money(row.seguroVehicular ?? 0, currency)}</td>
          <td>${money(row.seguroDesgravamen ?? 0, currency)}</td>
          <td>${money(row.seguro ?? 0, currency)}</td>
          <td>${money(row.amortizacion ?? 0, currency)}</td>
          <td>${money(row.saldoFinal ?? 0, currency)}</td>
          <td>${row.tipoGracia ?? '-'}</td>
        </tr>
      `
      )
      .join('');
  };

  const renderHistory = (items: SimulationResult[]) => {
    if (!items.length) {
      historialBodyEl.innerHTML = '<tr><td colspan="5">Sin resultados</td></tr>';
      return;
    }

    historialBodyEl.innerHTML = items
      .map((item) => {
        const id = item.id || '';
        const tcea = item.resumen?.tcea ?? 0;
        const totalPagado = item.resumen?.totalPagado ?? 0;
        const banco = item.banco?.nombre || '-';
        return `
          <tr>
            <td>${id || '-'}</td>
            <td>${banco}</td>
            <td>${pct(tcea)}</td>
            <td>${money(totalPagado, 'PEN')}</td>
            <td><button type="button" class="nav-link" data-open-sim="${id}">Abrir</button></td>
          </tr>
        `;
      })
      .join('');
  };

  const loadHistory = async () => {
    const filters = {
      moneda: fMonedaEl.value.trim() || undefined,
      plazoMeses: fPlazoEl.value ? Number(fPlazoEl.value) : undefined,
      vehiculo: fVehiculoEl.value.trim() || undefined,
      montoMin: fMontoMinEl.value ? Number(fMontoMinEl.value) : undefined,
      montoMax: fMontoMaxEl.value ? Number(fMontoMaxEl.value) : undefined,
      fechaDesde: fFechaDesdeEl.value || undefined,
      fechaHasta: fFechaHastaEl.value || undefined,
    };

    try {
      const data = await getSimulations(filters);
      renderHistory(data.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar historial.';
      if (message.includes('HTTP 401')) {
        historialBodyEl.innerHTML =
          '<tr><td colspan="5">Sesión no autorizada para historial (401). Inicia sesión nuevamente.</td></tr>';
        return;
      }
      throw error;
    }
  };

  const loadBanks = async () => {
    const data = await getBanks();
    bancos = data.items || [];

    bancoIdEl.innerHTML = `<option value="">Sin banco (manual)</option>${bancos
      .map((bank) => `<option value="${bank.id}">${bank.nombre} - ${bank.producto}</option>`)
      .join('')}`;
  };

  const loadVehicles = async () => {
    const data = await getVehicles();
    vehiculos = data.items || [];

    vehiculoIdEl.innerHTML = `<option value="">No usar vehículo guardado</option>${vehiculos
      .map((v) => `<option value="${v.id || ''}">${v.marca} ${v.modelo} (${v.anio})</option>`)
      .join('')}`;
  };

  const selectedVehicleData = (): Vehiculo => ({
    marca: marcaEl.value.trim(),
    modelo: modeloEl.value.trim(),
    anio: Math.max(1900, Math.trunc(toNumber(anioEl))),
    tipo: tipoEl.value.trim(),
    precio: toNumber(precioVehiculoEl),
    moneda: monedaEl.value,
  });

  const openSimulationById = async (id: string) => {
    if (!id) return;
    const detail = await getSimulationById(id);
    renderResumen(detail, monedaEl.value || 'PEN');
    renderBancoResult(detail);
    renderCronograma(detail, monedaEl.value || 'PEN');
    setMessage(okEl, `Simulación ${id} cargada`, false);
  };

  bancoIdEl.addEventListener('change', () => {
    const bank = getSelectedBank();
    renderBankInfo(bank);
    applyBankConstraints(bank);
    updateManualRateVisibility();
  });

  tipoGraciaEl.addEventListener('change', () => {
    if (tipoGraciaEl.value === 'sin_gracia') {
      periodosGraciaEl.value = '0';
      periodosGraciaEl.readOnly = true;
      return;
    }

    periodosGraciaEl.readOnly = false;
    if (Number(periodosGraciaEl.value) <= 0) periodosGraciaEl.value = '1';
  });

  vehiculoIdEl.addEventListener('change', () => {
    const vehiculo = vehiculos.find((item) => item.id === vehiculoIdEl.value);
    if (!vehiculo) return;
    marcaEl.value = vehiculo.marca;
    modeloEl.value = vehiculo.modelo;
    anioEl.value = String(vehiculo.anio);
    tipoEl.value = vehiculo.tipo;
    precioVehiculoEl.value = String(vehiculo.precio);
    monedaEl.value = vehiculo.moneda;
  });

  btnRegistrarVehiculoEl.addEventListener('click', async () => {
    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    try {
      const vehiculo = selectedVehicleData();
      await createVehicle(vehiculo);
      await loadVehicles();
      setMessage(okEl, 'Vehículo registrado correctamente.', false);
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'Error al registrar vehículo.', false);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    const tipoGracia = tipoGraciaEl.value as TipoGracia;
    const periodosGracia = Math.max(0, Math.trunc(toNumber(periodosGraciaEl)));

    if (tipoGracia === 'sin_gracia' && periodosGracia !== 0) {
      setMessage(errorEl, 'Si el tipo de gracia es sin_gracia, periodosGracia debe ser 0.', false);
      return;
    }

    if ((tipoGracia === 'parcial' || tipoGracia === 'total') && periodosGracia <= 0) {
      setMessage(errorEl, 'Si el tipo de gracia es parcial o total, periodosGracia debe ser mayor a 0.', false);
      return;
    }

    const payload: SimulationCreatePayload = {
      moneda: monedaEl.value,
      vehiculo: selectedVehicleData(),
      precioVehiculo: toNumber(precioVehiculoEl),
      porcentajeCuotaInicial: toNumber(porcentajeCuotaInicialEl),
      plazoMeses: Number(plazoMesesEl.value),
      tasaEfectivaAnual: toNumber(tasaEfectivaAnualEl),
      periodosPorAnio: 12,
      periodosGracia,
      tipoGracia,
      cuotaFinalBalloon: toNumber(cuotaFinalBalloonEl),
      seguroVehicularMensual: toNumber(seguroVehicularMensualEl),
      fechaInicio: fechaInicioEl.value,
    };

    const bank = getSelectedBank();
    if (bank) {
      payload.bancoId = bank.id;
      payload.tasaEfectivaAnual = bank.tasaEfectivaAnual;
      payload.seguroDesgravamenAnual = bank.seguroDesgravamenAnual;
    } else {
      payload.seguroDesgravamenAnual = toNumber(seguroDesgravamenAnualEl);
    }

    try {
      const result = await createSimulation(payload);
      renderResumen(result, payload.moneda);
      renderBancoResult(result);
      renderCronograma(result, payload.moneda);
      await loadHistory();
      setMessage(okEl, 'Simulación generada correctamente.', false);
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo generar la simulación.', false);
    }
  });

  historialFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();

    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    try {
      await loadHistory();
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo cargar historial.', false);
    }
  });

  historialBodyEl.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-open-sim]') as HTMLButtonElement | null;
    if (!button) return;

    const id = button.dataset.openSim || '';

    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    try {
      await openSimulationById(id);
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo abrir el detalle.', false);
    }
  });

  const boot = async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = `${today.getMonth() + 1}`.padStart(2, '0');
    const d = `${today.getDate()}`.padStart(2, '0');
    fechaInicioEl.value = `${y}-${m}-${d}`;

    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    try {
      await Promise.all([loadBanks(), loadVehicles()]);
      await loadHistory();
      updateManualRateVisibility();
      applyBankConstraints(null);
      tipoGraciaEl.dispatchEvent(new Event('change'));
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo inicializar el simulador.', false);
    }
  };

  void boot();
}

