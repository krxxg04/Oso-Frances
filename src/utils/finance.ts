export interface Pago {
    mes: number;
    cuota: number;
    interes: number;
    amortizacion: number;
    saldoDeudor: number;
}

const toInt = (n: number): number => (Number.isFinite(n) ? Math.trunc(n) : 0);

// Fórmulas de interés compuesto con TN (tasa nominal) y capitalización m
// Valor Futuro: S = C * (1 + TN/m)^n
export function calcularValorFuturo(C: number, TN: number, m: number, n: number): number {
    if (!Number.isFinite(C) || !Number.isFinite(TN) || !Number.isFinite(m) || !Number.isFinite(n) || m <= 0) {
        return Number.NaN;
    }
    return C * Math.pow(1 + TN / m, n);
}

// Valor Presente: C = S * (1 + TN/m)^(-n)
export function calcularValorPresente(S: number, TN: number, m: number, n: number): number {
    if (!Number.isFinite(S) || !Number.isFinite(TN) || !Number.isFinite(m) || !Number.isFinite(n) || m <= 0) {
        return Number.NaN;
    }
    return S * Math.pow(1 + TN / m, -n);
}

// Conversión de TN a tasa efectiva
// i = (1 + TN/m)^n - 1
export function tasaEfectivaDesdeNominal(TN: number, m: number, n: number): number {
    if (!Number.isFinite(TN) || !Number.isFinite(m) || !Number.isFinite(n) || m <= 0) return Number.NaN;
    return Math.pow(1 + TN / m, n) - 1;
}

// Tasa efectiva mensual (plazo ingresado en meses)
export function tasaEfectivaMensualDesdeTN(TN: number, m: number): number {
    return tasaEfectivaDesdeNominal(TN, m, m / 12);
}

const calcularCuotaFrances = (capital: number, tasaPeriodo: number, n: number): number => {
    if (!Number.isFinite(capital) || !Number.isFinite(tasaPeriodo) || !Number.isFinite(n)) return Number.NaN;
    if (n <= 0) return 0;
    if (tasaPeriodo === 0) return capital / n;
    return (capital * tasaPeriodo) / (1 - Math.pow(1 + tasaPeriodo, -n));
};

// Cuota fija mensual (Método Francés), usando TN anual y m capitalizaciones por año.
export function calcularCuotaFija(C: number, TN: number, m: number, n: number): number {
    const tasaMensual = tasaEfectivaMensualDesdeTN(TN, m);
    return calcularCuotaFrances(C, tasaMensual, toInt(n));
}

// Cronograma de pagos (Método Francés) con soporte de gracia:
// - Gracia total: no se paga cuota; el interés se capitaliza al saldo.
// - Gracia parcial: se paga solo interés; el saldo no amortiza.
export function generarCronograma(
    C: number,
    TN: number,
    m: number,
    n: number,
    periodosGracia: number,
    tipoGracia: 'total' | 'parcial'
): Pago[] {
    const meses = Math.max(0, toInt(n));
    const gracia = Math.min(meses, Math.max(0, toInt(periodosGracia)));
    if (meses === 0) return [];

    const tasaMensual = tasaEfectivaMensualDesdeTN(TN, m);
    if (!Number.isFinite(tasaMensual) || tasaMensual < 0) return [];

    const cronograma: Pago[] = [];
    let saldoDeudor = C;

    // Periodos de gracia
    for (let mes = 1; mes <= gracia; mes++) {
        const interes = saldoDeudor * tasaMensual;

        if (tipoGracia === 'total') {
            saldoDeudor += interes;
            cronograma.push({ mes, cuota: 0, interes, amortizacion: 0, saldoDeudor });
            continue;
        }

        // parcial: paga solo intereses
        cronograma.push({ mes, cuota: interes, interes, amortizacion: 0, saldoDeudor });
    }

    // Periodos con amortización (cuota fija) para los meses restantes
    const mesesRestantes = meses - gracia;
    const cuota = calcularCuotaFrances(saldoDeudor, tasaMensual, mesesRestantes);

    for (let mes = gracia + 1; mes <= meses; mes++) {
        const interes = saldoDeudor * tasaMensual;
        let amortizacion = cuota - interes;
        let cuotaMes = cuota;

        // Ajuste final por redondeos: no amortizar más que el saldo
        if (amortizacion > saldoDeudor) {
            amortizacion = saldoDeudor;
            cuotaMes = interes + amortizacion;
        }

        saldoDeudor -= amortizacion;
        cronograma.push({
            mes,
            cuota: cuotaMes,
            interes,
            amortizacion,
            saldoDeudor: saldoDeudor > 0 ? saldoDeudor : 0,
        });
    }

    return cronograma;
}

// VAN clásico con flujo en t=0 incluido:
// VAN = Σ (F_t / (1+r)^t)
export function calcularVAN(tasaDescuento: number, flujos: number[]): number {
    if (!Number.isFinite(tasaDescuento) || tasaDescuento <= -1) return Number.NaN;

    return flujos.reduce((van, flujo, periodo) => {
        return van + flujo / Math.pow(1 + tasaDescuento, periodo);
    }, 0);
}

// TIR (Newton-Raphson) sobre flujos con t=0 incluido.
export function calcularTIR(flujos: number[], iteraciones = 100, precision = 1e-7): number {
    const hasPos = flujos.some((f) => f > 0);
    const hasNeg = flujos.some((f) => f < 0);
    if (!(hasPos && hasNeg)) return Number.NaN;

    const npv = (r: number): number => calcularVAN(r, flujos);
    const dNpv = (r: number): number => {
        if (!Number.isFinite(r) || r <= -1) return Number.NaN;
        const base = 1 + r;

        return flujos.reduce((sum, flujo, t) => {
            if (t === 0) return sum;
            return sum - (t * flujo) / Math.pow(base, t + 1);
        }, 0);
    };

    // 1) Newton
    let tir = 0.1;
    for (let k = 0; k < iteraciones; k++) {
        const van = npv(tir);
        if (!Number.isFinite(van)) break;
        if (Math.abs(van) < precision) return tir;

        const deriv = dNpv(tir);
        if (!Number.isFinite(deriv) || deriv === 0) break;

        const next = tir - van / deriv;
        if (!Number.isFinite(next) || next <= -0.9999) break;
        if (Math.abs(next - tir) < precision) return next;
        tir = next;
    }

    // 2) Fallback bisección (más estable)
    let low = -0.9999;
    let high = 1;
    let fLow = npv(low);
    let fHigh = npv(high);

    let guard = 0;
    while (Number.isFinite(fLow) && Number.isFinite(fHigh) && fLow * fHigh > 0 && high < 1024 && guard < 50) {
        high *= 2;
        fHigh = npv(high);
        guard++;
    }

    if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) return Number.NaN;

    for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        const fMid = npv(mid);
        if (!Number.isFinite(fMid)) return Number.NaN;
        if (Math.abs(fMid) < precision) return mid;

        if (fLow * fMid < 0) {
            high = mid;
            fHigh = fMid;
        } else {
            low = mid;
            fLow = fMid;
        }
    }

    return (low + high) / 2;
}