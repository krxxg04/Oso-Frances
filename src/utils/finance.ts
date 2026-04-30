// Archivo: finance.ts

export interface Pago {
    mes: number;
    cuota: number;
    interes: number;
    amortizacion: number;
    saldoDeudor: number;
}

// Cálculo del Valor Futuro
export function calcularValorFuturo(C: number, TN: number, m: number, n: number): number {
    return C * Math.pow((1 + TN / m), n);
}

// Cálculo del Valor Presente
export function calcularValorPresente(S: number, TN: number, m: number, n: number): number {
    return S / Math.pow((1 + TN / m), n);
}

// Cálculo de la cuota fija mensual según el Método Francés
export function calcularCuotaFija(C: number, TN: number, m: number, n: number): number {
    const i = TN / m; // Tasa de interés por periodo
    return (C * i) / (1 - Math.pow(1 + i, -n));
}

// Generar cronograma de pagos
export function generarCronograma(
    C: number,
    TN: number,
    m: number,
    n: number,
    periodosGracia: number,
    tipoGracia: 'total' | 'parcial'
): Pago[] {
    const i = TN / m; // Tasa de interés por periodo
    const cuota = calcularCuotaFija(C, TN, m, n);
    const cronograma: Pago[] = [];

    let saldoDeudor = C;

    for (let mes = 1; mes <= n; mes++) {
        let interes = saldoDeudor * i;
        let amortizacion = 0;

        if (mes > periodosGracia) {
            amortizacion = cuota - interes;
        } else if (tipoGracia === 'total') {
            interes = saldoDeudor * i;
            amortizacion = 0;
        } else if (tipoGracia === 'parcial') {
            amortizacion = 0;
        }

        saldoDeudor -= amortizacion;

        cronograma.push({
            mes,
            cuota: mes > periodosGracia ? cuota : interes,
            interes,
            amortizacion,
            saldoDeudor: saldoDeudor > 0 ? saldoDeudor : 0
        });
    }

    return cronograma;
}

// Cálculo del VAN
export function calcularVAN(tasaDescuento: number, flujos: number[]): number {
    return flujos.reduce((van, flujo, periodo) => {
        return van + flujo / Math.pow(1 + tasaDescuento, periodo + 1);
    }, 0);
}

// Cálculo de la TIR
export function calcularTIR(flujos: number[], iteraciones = 100, precision = 1e-6): number {
    let tir = 0.1; // Suposición inicial

    for (let iteracion = 0; iteracion < iteraciones; iteracion++) {
        let van = calcularVAN(tir, flujos);
        let vanDerivada = flujos.reduce((suma, flujo, periodo) => {
            return suma - (periodo + 1) * flujo / Math.pow(1 + tir, periodo + 2);
        }, 0);

        const nuevaTir = tir - van / vanDerivada;
        if (Math.abs(nuevaTir - tir) < precision) {
            return nuevaTir;
        }

        tir = nuevaTir;
    }

    return tir;
}