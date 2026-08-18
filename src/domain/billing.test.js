import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals, applyPayment } from './billing';

const cerca = (valor, esperado) => expect(valor).toBeCloseTo(esperado, 2);

describe('computeInvoiceTotals', () => {
    it('aplica el ISV del 15%', () => {
        const t = computeInvoiceTotals([{ price: 100, quantity: 2 }]);

        cerca(t.subtotalBruto, 200);
        cerca(t.tax, 30);
        cerca(t.total, 230);
    });

    it('descuenta antes de gravar', () => {
        const t = computeInvoiceTotals([{ price: 100, quantity: 10 }], 10);

        cerca(t.discountValue, 100);
        cerca(t.subtotalNeto, 900);
        cerca(t.tax, 135);
        cerca(t.total, 1035);
    });

    it('no cobra las bonificaciones pero sí factura el resto', () => {
        const t = computeInvoiceTotals([
            { price: 50, quantity: 4 },
            { price: 0, quantity: 2, isBonus: true },
        ]);

        cerca(t.subtotalBruto, 200);
        cerca(t.total, 230);
    });

    it('una factura solo de bonificación no cobra nada', () => {
        const t = computeInvoiceTotals([{ price: 0, quantity: 5, isBonus: true }]);

        expect(t.subtotalBruto).toBe(0);
        expect(t.total).toBe(0);
    });

    it('trata los montos que llegan como texto desde los inputs', () => {
        const t = computeInvoiceTotals([{ price: '25.50', quantity: '4' }], '0');

        cerca(t.subtotalBruto, 102);
        cerca(t.total, 117.3);
    });

    it('una factura vacía no rompe', () => {
        expect(computeInvoiceTotals([]).total).toBe(0);
        expect(computeInvoiceTotals(undefined).total).toBe(0);
    });
});

describe('applyPayment', () => {
    const factura = { total: 1000, amountPaid: 0, status: 'Pendiente' };

    it('un abono parcial deja la factura Abonada con su saldo', () => {
        const r = applyPayment(factura, 400);

        cerca(r.amountPaid, 400);
        cerca(r.balanceDue, 600);
        expect(r.status).toBe('Abonada');
    });

    it('los abonos se acumulan hasta saldar', () => {
        const primero = applyPayment(factura, 400);
        const segundo = applyPayment({ ...factura, ...primero }, 600);

        cerca(segundo.amountPaid, 1000);
        expect(segundo.balanceDue).toBe(0);
        expect(segundo.status).toBe('Pagada');
    });

    it('un saldo de centavos cuenta como pagada, no como cuenta por cobrar', () => {
        const r = applyPayment(factura, 999.995);

        expect(r.status).toBe('Pagada');
    });

    it('un sobrepago no deja saldo negativo', () => {
        const r = applyPayment(factura, 1500);

        expect(r.balanceDue).toBe(0);
        expect(r.status).toBe('Pagada');
    });

    it('rechaza abonos de cero o negativos', () => {
        expect(() => applyPayment(factura, 0)).toThrow(/mayor que cero/);
        expect(() => applyPayment(factura, -50)).toThrow(/mayor que cero/);
    });
});
