import { describe, it, expect } from 'vitest';
import { planFEFODiscount, planReversal, stockFieldFor } from './fefo';

const lote = (id, expiryDate, stockSPS, stockTGU = 0) => ({
    id,
    lotNumber: `L-${id}`,
    productId: 'p1',
    productName: 'Producto 1',
    expiryDate,
    stockSPS,
    stockTGU,
});

describe('stockFieldFor', () => {
    it('mapea cada sucursal a su campo de stock', () => {
        expect(stockFieldFor('SPS')).toBe('stockSPS');
        expect(stockFieldFor('TGU')).toBe('stockTGU');
    });
});

describe('planFEFODiscount', () => {
    it('toma del lote que vence primero, no del primero de la lista', () => {
        const lotes = [
            lote('nuevo', '2027-01-01', 100),
            lote('viejo', '2026-03-01', 100),
        ];

        const plan = planFEFODiscount(lotes, { location: 'SPS', quantity: 10 });

        expect(plan).toEqual([
            { lotId: 'viejo', lotNumber: 'L-viejo', productName: 'Producto 1', quantity: 10 },
        ]);
    });

    it('parte la salida entre lotes cuando uno no alcanza', () => {
        const lotes = [
            lote('a', '2026-03-01', 8),
            lote('b', '2026-06-01', 20),
            lote('c', '2027-01-01', 50),
        ];

        const plan = planFEFODiscount(lotes, { location: 'SPS', quantity: 25 });

        expect(plan.map(p => [p.lotId, p.quantity])).toEqual([['a', 8], ['b', 17]]);
        expect(plan.reduce((acc, p) => acc + p.quantity, 0)).toBe(25);
    });

    it('no toca el lote de más adelante si el primero cubre todo', () => {
        const lotes = [lote('a', '2026-03-01', 30), lote('b', '2026-06-01', 30)];

        const plan = planFEFODiscount(lotes, { location: 'SPS', quantity: 30 });

        expect(plan).toHaveLength(1);
        expect(plan[0].lotId).toBe('a');
    });

    it('cuenta el stock de la sucursal que vende, no el total', () => {
        // 100 unidades en SPS, pero la venta sale de TGU, donde solo hay 5.
        const lotes = [lote('a', '2026-03-01', 100, 5)];

        expect(() => planFEFODiscount(lotes, { location: 'TGU', quantity: 10 }))
            .toThrow(/Faltaron 5 unidades/);

        const plan = planFEFODiscount(lotes, { location: 'TGU', quantity: 5 });
        expect(plan).toEqual([
            { lotId: 'a', lotNumber: 'L-a', productName: 'Producto 1', quantity: 5 },
        ]);
    });

    it('ignora lotes agotados en esa sucursal', () => {
        const lotes = [
            lote('agotado', '2026-01-01', 0),
            lote('con-stock', '2026-09-01', 12),
        ];

        const plan = planFEFODiscount(lotes, { location: 'SPS', quantity: 12 });

        expect(plan.map(p => p.lotId)).toEqual(['con-stock']);
    });

    it('falla sin escribir nada si el stock total no alcanza', () => {
        const lotes = [lote('a', '2026-03-01', 3), lote('b', '2026-06-01', 4)];

        expect(() => planFEFODiscount(lotes, { location: 'SPS', quantity: 10 }))
            .toThrow(/Faltaron 3 unidades/);
    });

    it('avisa cuando la sucursal no tiene ninguna unidad activa', () => {
        expect(() => planFEFODiscount([lote('a', '2026-03-01', 0)], { location: 'SPS', quantity: 1 }))
            .toThrow(/0 unidades activas en la sede SPS/);
        expect(() => planFEFODiscount([], { location: 'TGU', quantity: 1 }))
            .toThrow(/0 unidades activas en la sede TGU/);
    });

    it('exige sede y cantidad', () => {
        const lotes = [lote('a', '2026-03-01', 10)];

        expect(() => planFEFODiscount(lotes, { quantity: 5 })).toThrow(/Datos FEFO incompletos/);
        expect(() => planFEFODiscount(lotes, { location: 'SPS' })).toThrow(/Datos FEFO incompletos/);
    });
});

describe('planReversal', () => {
    it('devuelve al lote de vencimiento más lejano', () => {
        const lotes = [
            lote('vence-pronto', '2026-03-01', 5),
            lote('vence-tarde', '2027-12-01', 0),
        ];

        expect(planReversal(lotes, { quantity: 4 })).toEqual({
            lotId: 'vence-tarde',
            lotNumber: 'L-vence-tarde',
            productName: 'Producto 1',
            quantity: 4,
        });
    });

    it('devuelve null si el producto ya no tiene lotes', () => {
        expect(planReversal([], { quantity: 4 })).toBeNull();
    });

    it('rechaza cantidades no positivas', () => {
        expect(() => planReversal([lote('a', '2026-03-01', 5)], { quantity: 0 }))
            .toThrow(/mayor que cero/);
    });
});

describe('venta y anulación de punta a punta', () => {
    it('deja el inventario cuadrado, aunque las unidades cambien de lote', () => {
        const lotes = [lote('a', '2026-03-01', 8), lote('b', '2027-01-01', 20)];
        const totalAntes = lotes.reduce((acc, l) => acc + l.stockSPS, 0);

        const venta = planFEFODiscount(lotes, { location: 'SPS', quantity: 12 });
        venta.forEach(({ lotId, quantity }) => {
            lotes.find(l => l.id === lotId).stockSPS -= quantity;
        });
        expect(lotes.map(l => l.stockSPS)).toEqual([0, 16]); // 8 del viejo + 4 del nuevo

        const devolucion = planReversal(lotes, { quantity: 12 });
        lotes.find(l => l.id === devolucion.lotId).stockSPS += devolucion.quantity;

        expect(lotes.reduce((acc, l) => acc + l.stockSPS, 0)).toBe(totalAntes);
        // Las 8 unidades del lote viejo no regresan a él: es el límite conocido del reverso.
        expect(lotes.find(l => l.id === 'a').stockSPS).toBe(0);
    });
});
