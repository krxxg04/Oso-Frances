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
  type TipoTasa,
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

const pctFromPercentage = (value: number): string => `${(Number(value) || 0).toFixed(4)}%`;
const pctFromDecimal = (value: number): string => `${((Number(value) || 0) * 100).toFixed(4)}%`;
const pctAutoRate = (value: number): string => {
  const n = Number(value) || 0;
  const percent = Math.abs(n) <= 1 ? n * 100 : n;
  return `${percent.toFixed(4)}%`;
};

const toNumber = (input: HTMLInputElement): number => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
};

const setMessage = (el: HTMLElement, message: string, hidden: boolean) => {
  el.textContent = message;
  el.classList.toggle('hidden', hidden);
};

const MANUAL_BANK_ID = 'manual';
const MIN_PRECIO_VEHICULO = 2000;
const MAX_PRECIO_VEHICULO = 500000;
const MAX_SEGURO_VEHICULAR_MENSUAL = 5000;
const MAX_PERIODOS_GRACIA = 6;

const formatPenAmount = (value: number): string =>
  new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

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
  const precioVehiculoErrorEl = getRequiredEl<HTMLParagraphElement>('precioVehiculo-error');
  const periodosGraciaErrorEl = getRequiredEl<HTMLParagraphElement>('periodosGracia-error');
  const cuotaFinalBalloonHelpEl = getRequiredEl<HTMLParagraphElement>('cuotaFinalBalloon-help');
  const cuotaFinalBalloonErrorEl = getRequiredEl<HTMLParagraphElement>('cuotaFinalBalloon-error');
  const seguroVehicularMensualErrorEl = getRequiredEl<HTMLParagraphElement>('seguroVehicularMensual-error');

  const bancoInfoWrapEl = getRequiredEl<HTMLDivElement>('banco-info');
  const bancoInfoTextEl = getRequiredEl<HTMLParagraphElement>('banco-info-text');

  const manualRateFieldsEl = getRequiredEl<HTMLDivElement>('manual-rate-fields');
  const tipoTasaEl = getRequiredEl<HTMLSelectElement>('tipoTasa');
  const tasaAnualEl = getRequiredEl<HTMLInputElement>('tasaAnual');
  const frecuenciaCapitalizacionFieldEl = getRequiredEl<HTMLDivElement>('frecuencia-capitalizacion-field');
  const frecuenciaCapitalizacionEl = getRequiredEl<HTMLInputElement>('frecuenciaCapitalizacion');
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
    if (inputObj?.bancoId === MANUAL_BANK_ID) return 'Manual';
    if (typeof inputObj?.bancoId === 'string' && inputObj.bancoId) return inputObj.bancoId;

    return '-';
  };

  const renderPlazos = (plazos: number[]) => {
    const unique = [...new Set(plazos)].sort((a, b) => a - b);
    const options = unique.length > 0 ? unique : [24, 36];
    plazoMesesEl.innerHTML = options.map((plazo) => `<option value="${plazo}">${plazo}</option>`).join('');
  };

  const updateManualRateVisibility = () => {
    manualRateFieldsEl.classList.toggle('hidden', bancoIdEl.value !== MANUAL_BANK_ID);
  };

  const updateCapitalizacionVisibility = () => {
    const shouldShow = bancoIdEl.value === MANUAL_BANK_ID && tipoTasaEl.value === 'nominal';
    frecuenciaCapitalizacionFieldEl.classList.toggle('hidden', !shouldShow);
  };

  const renderBankInfo = (bank: Banco | null) => {
    if (!bank) {
      bancoInfoWrapEl.classList.add('hidden');
      bancoInfoTextEl.textContent = '';
      return;
    }

    bancoInfoWrapEl.classList.remove('hidden');
    tasaAnualEl.value = String(bank.tasaEfectivaAnual);
    seguroDesgravamenAnualEl.value = String(bank.seguroDesgravamenAnual);
    bancoInfoTextEl.textContent = `${bank.nombre} · ${bank.producto} · TEA ${pctAutoRate(bank.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pctFromPercentage(bank.seguroDesgravamenMensual)}`;
  };

  const applyBankConstraints = (bank: Banco | null) => {
    if (!bank) {
      porcentajeCuotaInicialEl.min = '0';
      porcentajeCuotaInicialEl.max = '100';
      periodosGraciaEl.max = String(MAX_PERIODOS_GRACIA);
      renderPlazos([24, 36]);
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

    const periodosGraciaMax = Math.min(bank.periodosGraciaMax, MAX_PERIODOS_GRACIA);
    periodosGraciaEl.max = String(periodosGraciaMax);
    if (Number(periodosGraciaEl.value) > periodosGraciaMax) {
      periodosGraciaEl.value = String(periodosGraciaMax);
    }

    const plazosBanco = bank.plazosMeses || [];
    renderPlazos(plazosBanco);
    if (!plazosBanco.includes(Number(plazoMesesEl.value)) && plazosBanco.length > 0) {
      plazoMesesEl.value = String(plazosBanco[0]);
    }
  };

  const getSelectedBank = (): Banco | null => {
    if (bancoIdEl.value === MANUAL_BANK_ID) return null;
    return bancos.find((item) => item.id === bancoIdEl.value) ?? null;
  };

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
      ['TEA', pctAutoRate(tasaEfectivaAnualValue)],
      ['Tasa periodo', pctAutoRate(tasaPeriodoValue)],
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
    bancoResultadoEl.textContent = `${result.banco.nombre} · ${result.banco.producto} · TEA ${pctAutoRate(result.banco.tasaEfectivaAnual)} · Seguro desgravamen mensual ${pctFromPercentage(result.banco.seguroDesgravamenMensual)} · Seguro desgravamen anual ${pctFromPercentage(result.banco.seguroDesgravamenAnual)}`;
  };

  const renderCronograma = (result: SimulationResult, currency: string) => {
    const cronograma = result.result?.cronograma || [];
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

    bancoIdEl.innerHTML = `<option value="${MANUAL_BANK_ID}">Sin banco (manual)</option>${bancos
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

  const setFieldError = (
    input: HTMLInputElement,
    errorEl: HTMLParagraphElement,
    message: string | null
  ) => {
    input.setCustomValidity(message ?? '');
    input.classList.toggle('is-invalid', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    setMessage(errorEl, message ?? '', !message);
  };

  const getBalloonMax = (): number => Math.max(0, toNumber(precioVehiculoEl) * 0.5);

  const syncBalloonConstraints = (normalizeValue: boolean) => {
    const balloonMax = getBalloonMax();
    cuotaFinalBalloonEl.max = String(balloonMax);
    cuotaFinalBalloonHelpEl.textContent = `Maximo permitido: S/ ${formatPenAmount(balloonMax)}`;

    if (normalizeValue && toNumber(cuotaFinalBalloonEl) > balloonMax) {
      cuotaFinalBalloonEl.value = String(balloonMax);
    }
  };

  const syncTipoGraciaState = () => {
    if (tipoGraciaEl.value === 'sin_gracia') {
      periodosGraciaEl.value = '0';
      periodosGraciaEl.disabled = true;
      periodosGraciaEl.readOnly = true;
      return;
    }

    periodosGraciaEl.disabled = false;
    periodosGraciaEl.readOnly = false;
    if (Number(periodosGraciaEl.value) <= 0) periodosGraciaEl.value = '1';
  };

  const validateControlledFields = (): string | null => {
    let firstError: string | null = null;

    const precioVehiculo = toNumber(precioVehiculoEl);
    const precioVehiculoError =
      precioVehiculo < MIN_PRECIO_VEHICULO || precioVehiculo > MAX_PRECIO_VEHICULO
        ? 'El precio del vehículo debe estar entre S/ 2,000 y S/ 500,000'
        : null;
    setFieldError(precioVehiculoEl, precioVehiculoErrorEl, precioVehiculoError);
    if (!firstError && precioVehiculoError) firstError = precioVehiculoError;

    const balloonMax = getBalloonMax();
    const cuotaFinalBalloon = toNumber(cuotaFinalBalloonEl);
    const cuotaFinalBalloonError =
      cuotaFinalBalloon < 0 || cuotaFinalBalloon > balloonMax
        ? 'La cuota final balloon no puede superar el 50% del precio del vehículo'
        : null;
    setFieldError(cuotaFinalBalloonEl, cuotaFinalBalloonErrorEl, cuotaFinalBalloonError);
    if (!firstError && cuotaFinalBalloonError) firstError = cuotaFinalBalloonError;

    const seguroVehicularMensual = toNumber(seguroVehicularMensualEl);
    const seguroVehicularMensualError =
      seguroVehicularMensual < 0 || seguroVehicularMensual > MAX_SEGURO_VEHICULAR_MENSUAL
        ? 'El seguro vehicular mensual debe estar entre S/ 0 y S/ 5,000'
        : null;
    setFieldError(seguroVehicularMensualEl, seguroVehicularMensualErrorEl, seguroVehicularMensualError);
    if (!firstError && seguroVehicularMensualError) firstError = seguroVehicularMensualError;

    const periodosGracia = Math.trunc(toNumber(periodosGraciaEl));
    let periodosGraciaError: string | null = null;
    if (periodosGracia < 0 || periodosGracia > MAX_PERIODOS_GRACIA) {
      periodosGraciaError = 'Los períodos de gracia no pueden superar 6';
    } else if (tipoGraciaEl.value === 'sin_gracia' && periodosGracia !== 0) {
      periodosGraciaError = 'Los períodos de gracia deben ser 0 cuando no hay gracia';
    } else if (
      (tipoGraciaEl.value === 'parcial' || tipoGraciaEl.value === 'total') &&
      periodosGracia < 1
    ) {
      periodosGraciaError = 'Debes ingresar al menos 1 período de gracia para gracia parcial o total';
    }
    setFieldError(periodosGraciaEl, periodosGraciaErrorEl, periodosGraciaError);
    if (!firstError && periodosGraciaError) firstError = periodosGraciaError;

    return firstError;
  };

  const updateCalculateButtonState = () => {
    btnCalcularEl.disabled = !!validateSimulationInputs();
  };

  const refreshFrontendValidation = (showGlobalError = false) => {
    syncBalloonConstraints(true);
    const firstError = validateControlledFields();
    const fullValidationError = validateSimulationInputs();

    if (showGlobalError) {
      setMessage(errorEl, fullValidationError ?? '', !fullValidationError);
      if (!fullValidationError) setMessage(okEl, '', true);
    } else if (!fullValidationError || fullValidationError === firstError) {
      setMessage(errorEl, '', true);
    }

    updateCalculateButtonState();
    return fullValidationError;
  };

  const validateSimulationInputs = (): string | null => {
    const cuotaInicial = toNumber(porcentajeCuotaInicialEl);
    const precioVehiculo = toNumber(precioVehiculoEl);
    const seguroVehicularMensual = toNumber(seguroVehicularMensualEl);
    const periodosGracia = Math.trunc(toNumber(periodosGraciaEl));
    const cuotaFinalBalloon = toNumber(cuotaFinalBalloonEl);

    if (precioVehiculo < MIN_PRECIO_VEHICULO || precioVehiculo > MAX_PRECIO_VEHICULO) {
      return 'El precio del vehículo debe estar entre S/ 2,000 y S/ 500,000';
    }
    if (cuotaFinalBalloon < 0 || cuotaFinalBalloon > getBalloonMax()) {
      return 'La cuota final balloon no puede superar el 50% del precio del vehículo';
    }
    if (seguroVehicularMensual < 0 || seguroVehicularMensual > MAX_SEGURO_VEHICULAR_MENSUAL) {
      return 'El seguro vehicular mensual debe estar entre S/ 0 y S/ 5,000';
    }
    if (periodosGracia < 0 || periodosGracia > MAX_PERIODOS_GRACIA) {
      return 'Los períodos de gracia no pueden superar 6';
    }
    if (tipoGraciaEl.value === 'sin_gracia' && periodosGracia !== 0) {
      return 'Los períodos de gracia deben ser 0 cuando no hay gracia';
    }
    if ((tipoGraciaEl.value === 'parcial' || tipoGraciaEl.value === 'total') && periodosGracia < 1) {
      return 'Debes ingresar al menos 1 período de gracia para gracia parcial o total';
    }

    if (!marcaEl.value.trim()) return 'Ingresa la marca del vehículo.';
    if (!modeloEl.value.trim()) return 'Ingresa el modelo del vehículo.';
    if (!Number.isFinite(toNumber(anioEl)) || toNumber(anioEl) < 2000) return 'Ingresa un año válido (>= 2000).';
    if (!tipoEl.value.trim()) return 'Ingresa el tipo de vehículo.';
    if (!Number.isFinite(cuotaInicial) || cuotaInicial < 0)
      return 'Ingresa una cuota inicial válida.';
    if (cuotaInicial > 100) return 'La cuota inicial debe estar entre 0% y 100%.';
    const bank = getSelectedBank();
    if (!bank) {
      if (!Number.isFinite(toNumber(tasaAnualEl)) || toNumber(tasaAnualEl) <= 0)
        return 'Ingresa una tasa anual mayor a 0.';
      if (toNumber(tasaAnualEl) > 100) return 'La tasa anual debe estar entre 0 y 100.';
      if (tipoTasaEl.value === 'nominal') {
        const frecuenciaCapitalizacion = Math.trunc(toNumber(frecuenciaCapitalizacionEl));
        if (frecuenciaCapitalizacion <= 0) return 'La frecuencia de capitalizacion debe ser mayor a 0.';
      }
      const seguroDesgravamen = toNumber(seguroDesgravamenAnualEl);
      if (!Number.isFinite(seguroDesgravamen)) return 'Ingresa un seguro de desgravamen anual valido.';
      if (seguroDesgravamen < 0 || seguroDesgravamen > 100)
        return 'El seguro de desgravamen anual debe estar entre 0 y 100.';
    } else {
      if (monedaEl.value !== bank.moneda) {
        return `La moneda para ${bank.nombre} debe ser ${bank.moneda}.`;
      }

      if (precioVehiculo < bank.montoMin) {
        return `El precio del vehiculo para ${bank.nombre} debe ser al menos ${bank.montoMin} ${bank.moneda}.`;
      }

      if (cuotaInicial < bank.porcentajeCuotaInicialMin || cuotaInicial > bank.porcentajeCuotaInicialMax) {
        return `La cuota inicial para ${bank.nombre} debe estar entre ${bank.porcentajeCuotaInicialMin}% y ${bank.porcentajeCuotaInicialMax}%.`;
      }

      if (periodosGracia > bank.periodosGraciaMax) {
        return `El numero de periodos de gracia para ${bank.nombre} no puede superar ${bank.periodosGraciaMax}.`;
      }

      if (!bank.plazosMeses.includes(Number(plazoMesesEl.value))) {
        return `El plazo para ${bank.nombre} debe ser uno de estos valores: ${bank.plazosMeses.join(', ')} meses.`;
      }
    }
    if (![24, 36].includes(Number(plazoMesesEl.value))) {
      return 'El plazo debe ser 24 o 36 meses para Compra Inteligente.';
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
    updateCapitalizacionVisibility();
    refreshFrontendValidation(true);
  });

  tipoTasaEl.addEventListener('change', () => {
    updateCapitalizacionVisibility();
    refreshFrontendValidation();
  });

  tipoGraciaEl.addEventListener('change', () => {
    syncTipoGraciaState();
    refreshFrontendValidation(true);
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
    refreshFrontendValidation(true);
  });

  [precioVehiculoEl, cuotaFinalBalloonEl, seguroVehicularMensualEl, periodosGraciaEl].forEach((input) => {
    input.addEventListener('input', () => {
      if (input === precioVehiculoEl) syncBalloonConstraints(true);
      refreshFrontendValidation();
    });
    input.addEventListener('blur', () => {
      if (input === precioVehiculoEl) syncBalloonConstraints(true);
      refreshFrontendValidation(true);
    });
  });

  [
    marcaEl,
    modeloEl,
    anioEl,
    tipoEl,
    monedaEl,
    bancoIdEl,
    porcentajeCuotaInicialEl,
    plazoMesesEl,
    fechaInicioEl,
    tasaAnualEl,
    frecuenciaCapitalizacionEl,
    seguroDesgravamenAnualEl,
  ].forEach((input) => {
    input.addEventListener('input', () => refreshFrontendValidation());
    input.addEventListener('change', () => refreshFrontendValidation());
    input.addEventListener('blur', () => refreshFrontendValidation(true));
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
    const validationError = refreshFrontendValidation(true);
    if (validationError) {
      setMessage(errorEl, validationError, false);
      setMessage(okEl, '', true);
      return;
    }

    setMessage(errorEl, '', true);
    setMessage(okEl, '', true);

    const tipoGracia = tipoGraciaEl.value as TipoGracia;
    const periodosGracia = Math.max(0, Math.trunc(toNumber(periodosGraciaEl)));

    btnCalcularEl.disabled = true;
    btnCalcularEl.textContent = 'Simulando...';

    const payload: SimulationCreatePayload = {
      moneda: monedaEl.value,
      vehiculo: selectedVehicleData(),
      porcentajeCuotaInicial: toNumber(porcentajeCuotaInicialEl),
      plazoMeses: Number(plazoMesesEl.value),
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
    } else {
      payload.bancoId = MANUAL_BANK_ID;
      payload.tipoTasa = tipoTasaEl.value as TipoTasa;
      const tasaManual = toNumber(tasaAnualEl);
      if (payload.tipoTasa === 'efectiva') {
        payload.tasaEfectivaAnual = tasaManual;
      } else {
        payload.tasaAnual = tasaManual;
        payload.frecuenciaCapitalizacion = Math.trunc(toNumber(frecuenciaCapitalizacionEl));
      }
      payload.seguroDesgravamenAnual = toNumber(seguroDesgravamenAnualEl);
    }

    try {
      console.log('[simulador] payload POST /api/v1/simulaciones', payload);
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
      updateCalculateButtonState();
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
      updateCapitalizacionVisibility();
      applyBankConstraints(null);
      syncBalloonConstraints(false);
      syncTipoGraciaState();
      refreshFrontendValidation();
    } catch (error) {
      setMessage(errorEl, error instanceof Error ? error.message : 'No se pudo inicializar el simulador.', false);
    }
  };

  void boot();
}

