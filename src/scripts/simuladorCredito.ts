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

const pctFromDecimal = (value: number): string => `${((Number(value) || 0) * 100).toFixed(4)}%`;

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
  const btnCalcularEl = getRequiredEl<HTMLButtonElement>('btn-calcular');

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
  const cronogramaScrollEl = getRequiredEl<HTMLDivElement>('cronograma-scroll');
  const toggleCronogramaEl = getRequiredEl<HTMLButtonElement>('toggle-cronograma');
  const cronogramaHintEl = getRequiredEl<HTMLParagraphElement>('cronograma-hint');

  const historialFormEl = getRequiredEl<HTMLFormElement>('historial-filtros');
  const historialBodyEl = getRequiredEl<HTMLTableSectionElement>('historial-body');
  const fMonedaEl = getRequiredEl<HTMLInputElement>('f-moneda');
  const fPlazoEl = getRequiredEl<HTMLSelectElement>('f-plazo');
  const fVehiculoEl = getRequiredEl<HTMLInputElement>('f-vehiculo');
  const fMontoMinEl = getRequiredEl<HTMLInputElement>('f-monto-min');
  const fMontoMaxEl = getRequiredEl<HTMLInputElement>('f-monto-max');
  const fFechaDesdeEl = getRequiredEl<HTMLInputElement>('f-fecha-desde');
  const fFechaHastaEl = getRequiredEl<HTMLInputElement>('f-fecha-hasta');

  let bancos: Banco[] = [];
  let vehiculos: Vehiculo[] = [];

  const normalizeSimulation = (raw: unknown): SimulationResult => {
    const data = raw as Record<string, unknown> | null;
    if (!data) return {} as SimulationResult;
    if (data.item && typeof data.item === 'object') return data.item as SimulationResult;
    if (data.simulacion && typeof data.simulacion === 'object') return data.simulacion as SimulationResult;
    return data as SimulationResult;
  };

  const pickBancoFromSimulation = (sim: SimulationResult): string => {
    if (sim.banco?.nombre) return sim.banco.nombre;

    const resultObj = sim.result as Record<string, unknown> | undefined;
    const bancoObj = resultObj?.banco as Record<string, unknown> | undefined;
    if (typeof bancoObj?.nombre === 'string' && bancoObj.nombre) return bancoObj.nombre;

    const inputObj = (sim as unknown as { input?: Record<string, unknown> }).input;
    if (typeof inputObj?.bancoNombre === 'string' && inputObj.bancoNombre) return inputObj.bancoNombre;
    if (typeof inputObj?.bancoId === 'string' && inputObj.bancoId) return inputObj.bancoId;

    return '-';
  };

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
    bancoInfoTextEl.textContent = `${bank.nombre} · ${bank.producto} · TEA ${pctFromDecimal(bank.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pctFromDecimal(bank.seguroDesgravamenMensual)}`;
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

    const plazosBanco = bank.plazosMeses || [];
    renderPlazos(plazosBanco);
    if (!plazosBanco.includes(Number(plazoMesesEl.value)) && plazosBanco.length > 0) {
      plazoMesesEl.value = String(plazosBanco[0]);
    }
  };

  const getSelectedBank = (): Banco | null => bancos.find((item) => item.id === bancoIdEl.value) ?? null;

  const renderResumen = (result: SimulationResult, currency: string) => {
    const resumen = result.result?.resumen;
    if (!resumen) {
      resumenGridEl.innerHTML = '';
      return;
    }

    const tasaEfectivaAnualValue =
      result.result?.tasa?.tasaEfectivaAnual ?? result.tasa?.tasaEfectivaAnual ?? 0;
    const tasaPeriodoValue = result.result?.tasaPeriodo ?? result.tasaPeriodo ?? 0;

    const items: Array<[string, string]> = [
      ['TEA', pctFromDecimal(tasaEfectivaAnualValue)],
      ['Tasa periodo', pctFromDecimal(tasaPeriodoValue)],
      ['Monto financiado', money(resumen.montoFinanciado, currency)],
      ['Cuota inicial', money(resumen.cuotaInicial, currency)],
      ['Cuota mensual', money(resumen.cuotaMensual, currency)],
      ['Cuota final balloon', money(resumen.cuotaFinalBalloon, currency)],
      ['Total intereses', money(resumen.totalIntereses, currency)],
      ['Total seguros', money(resumen.totalSeguros, currency)],
      ['Total pagado', money(resumen.totalPagado, currency)],
      ['TCEA', pctFromDecimal(resumen.tcea)],
      ['VAN', money(resumen.van, currency)],
      ['TIR', pctFromDecimal(resumen.tir)],
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
    bancoResultadoEl.textContent = `${result.banco.nombre} · ${result.banco.producto} · TEA ${pctFromDecimal(result.banco.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pctFromDecimal(result.banco.seguroDesgravamenMensual)} · Seguro desgravamen anual ${pctFromDecimal(result.banco.seguroDesgravamenAnual)}`;
  };

  const renderCronograma = (result: SimulationResult, currency: string) => {
    const cronograma = result.result?.cronograma || [];
    cronogramaBodyEl.innerHTML = cronograma
      .map(
        (row) => {
          const seguroVehicular = row.seguroVehicular ?? 0;
          const seguroDesgravamen = row.seguroDesgravamen ?? 0;
          const seguroTotal = seguroVehicular + seguroDesgravamen;
          return `
        <tr>
          <td>${row.mes ?? '-'}</td>
          <td>${row.fecha ?? '-'}</td>
          <td>${money(row.saldoInicial ?? 0, currency)}</td>
          <td>${money(row.cuota ?? 0, currency)}</td>
          <td>${money(row.cuotaCapitalInteres ?? 0, currency)}</td>
          <td>${money(row.interes ?? 0, currency)}</td>
          <td>${money(seguroVehicular, currency)}</td>
          <td>${money(seguroDesgravamen, currency)}</td>
          <td>${money(seguroTotal, currency)}</td>
          <td>${money(row.amortizacion ?? 0, currency)}</td>
          <td>${money(row.saldoFinal ?? 0, currency)}</td>
          <td>${row.tipoGracia ?? '-'}</td>
        </tr>
      `;
        }
      )
      .join('');
  };

  const renderHistory = (items: SimulationResult[]) => {
    if (!items.length) {
      historialBodyEl.innerHTML = '<tr><td colspan="5">Sin resultados</td></tr>';
      return;
    }

    historialBodyEl.innerHTML = items
      .map((rawItem) => {
        const item = normalizeSimulation(rawItem);
        const id = item.id || '';
        const tcea = item.result?.resumen?.tcea ?? 0;
        const totalPagado = item.result?.resumen?.totalPagado ?? 0;
        const banco = pickBancoFromSimulation(item);
        return `
          <tr>
            <td>${id || '-'}</td>
            <td>${banco}</td>
            <td>${pctFromDecimal(tcea)}</td>
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
      const items = (data.items || []).map((item) => normalizeSimulation(item));
      renderHistory(items);
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

  const validateSimulationInputs = (): string | null => {
    if (!marcaEl.value.trim()) return 'Ingresa la marca del vehículo.';
    if (!modeloEl.value.trim()) return 'Ingresa el modelo del vehículo.';
    if (!Number.isFinite(toNumber(anioEl)) || toNumber(anioEl) < 2000) return 'Ingresa un año válido (>= 2000).';
    if (!tipoEl.value.trim()) return 'Ingresa el tipo de vehículo.';
    if (!Number.isFinite(toNumber(precioVehiculoEl)) || toNumber(precioVehiculoEl) <= 0)
      return 'Ingresa un precio de vehículo mayor a 0.';
    if (!Number.isFinite(toNumber(porcentajeCuotaInicialEl)) || toNumber(porcentajeCuotaInicialEl) < 0)
      return 'Ingresa una cuota inicial válida.';
    const bank = getSelectedBank();
    if (!bank) {
      if (!Number.isFinite(toNumber(tasaEfectivaAnualEl)) || toNumber(tasaEfectivaAnualEl) <= 0)
        return 'Ingresa una Tasa Efectiva Anual (TEA) mayor a 0.';
      if (toNumber(tasaEfectivaAnualEl) > 100) return 'La TEA debe estar entre 0 y 100.';
      const seguroDesgravamen = toNumber(seguroDesgravamenAnualEl);
      if (!Number.isFinite(seguroDesgravamen)) return 'Ingresa un seguro de desgravamen anual válido.';
      if (seguroDesgravamen < 0 || seguroDesgravamen > 100)
        return 'El seguro de desgravamen anual debe estar entre 0 y 100.';
    } else {
      const cuotaInicial = toNumber(porcentajeCuotaInicialEl);
      if (cuotaInicial < bank.porcentajeCuotaInicialMin || cuotaInicial > bank.porcentajeCuotaInicialMax) {
        return `La cuota inicial para ${bank.nombre} debe estar entre ${bank.porcentajeCuotaInicialMin}% y ${bank.porcentajeCuotaInicialMax}%.`;
      }
      const periodosGracia = Math.trunc(toNumber(periodosGraciaEl));
      if (periodosGracia > bank.periodosGraciaMax) {
        return `El número de periodos de gracia para ${bank.nombre} no puede superar ${bank.periodosGraciaMax}.`;
      }
    }
    if (!fechaInicioEl.value) return 'Selecciona una fecha de inicio.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicioEl.value)) return 'La fecha de inicio debe estar en formato YYYY-MM-DD.';
    return null;
  };

  const openSimulationById = async (id: string) => {
    if (!id) return;
    const rawDetail = await getSimulationById(id);
    const detail = normalizeSimulation(rawDetail);
    const detailCurrency =
      ((detail as unknown as { input?: { moneda?: string } }).input?.moneda as string | undefined) ||
      monedaEl.value ||
      'PEN';
    renderResumen(detail, detailCurrency);
    renderBancoResult(detail);
    renderCronograma(detail, detailCurrency);
    cronogramaScrollEl.classList.remove('hidden');
    toggleCronogramaEl.textContent = 'Ocultar';
    document.getElementById('resumen-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMessage(okEl, `Simulación ${id} cargada`, false);
  };

  toggleCronogramaEl.addEventListener('click', () => {
    const isHidden = cronogramaScrollEl.classList.toggle('hidden');
    toggleCronogramaEl.textContent = isHidden ? 'Mostrar' : 'Ocultar';
    cronogramaHintEl.textContent = isHidden
      ? 'Cronograma oculto. Presiona "Mostrar" para verlo.'
      : 'Visualiza el detalle mes a mes.';
  });

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
    const validationError = validateSimulationInputs();
    if (validationError) {
      setMessage(errorEl, validationError, false);
      setMessage(okEl, '', true);
      return;
    }

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

    btnCalcularEl.disabled = true;
    btnCalcularEl.textContent = 'Simulando...';

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
      const hasResumen = !!result.result?.resumen;
      const hasCronograma = (result.result?.cronograma ?? []).length > 0;
      renderResumen(result, payload.moneda);
      renderBancoResult(result);
      renderCronograma(result, payload.moneda);
      cronogramaScrollEl.classList.remove('hidden');
      toggleCronogramaEl.textContent = 'Ocultar';
      cronogramaHintEl.textContent = 'Visualiza el detalle mes a mes.';
      await loadHistory();
      if (!hasResumen && !hasCronograma) {
        setMessage(
          errorEl,
          'La API respondio sin datos de simulacion. Verifica que /api/v1/simulaciones devuelva result.resumen y result.cronograma.',
          false
        );
        return;
      }

      setMessage(okEl, 'Simulación generada correctamente.', false);
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo generar la simulación.', false);
    } finally {
      btnCalcularEl.disabled = false;
      btnCalcularEl.textContent = 'Simular crédito';
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

