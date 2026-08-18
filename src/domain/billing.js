// Reglas de facturación y cobranza, sin Firestore.

/** ISV de Honduras. */
export const TAX_RATE = 0.15;

/**
 * Totales de una factura.
 *
 * Los renglones de bonificación se entregan al cliente y descuentan inventario, pero no suman
 * al subtotal: por eso quedan fuera de la base gravable.
 *
 * @param {Array<{price:number, quantity:number, isBonus?:boolean}>} items
 * @param {number} discountPercent descuento global, en porcentaje
 */
export const computeInvoiceTotals = (items, discountPercent = 0, taxRate = TAX_RATE) => {
    const subtotalBruto = (items || [])
        .filter((item) => !item.isBonus)
        .reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

    const pct = Number(discountPercent) || 0;
    const discountValue = subtotalBruto * (pct / 100);
    const subtotalNeto = subtotalBruto - discountValue;
    const tax = subtotalNeto * taxRate;
    const total = subtotalNeto + tax;

    return { subtotalBruto, discountValue, subtotalNeto, tax, total };
};

/** Céntimo de tolerancia: L 0.01 de saldo es una factura pagada, no una cuenta por cobrar. */
const EPSILON = 0.01;

/**
 * Aplica un abono y devuelve el nuevo estado de la cuenta por cobrar.
 * Pendiente → Abonada → Pagada, según el saldo.
 *
 * @param {{total:number, amountPaid?:number, status?:string}} invoice
 * @param {number} amount monto del abono
 */
export const applyPayment = (invoice, amount) => {
    const abono = Number(amount) || 0;
    if (abono <= 0) throw new Error('El abono debe ser mayor que cero.');

    const amountPaid = (Number(invoice?.amountPaid) || 0) + abono;
    const balanceDue = Math.max(0, (Number(invoice?.total) || 0) - amountPaid);

    let status = invoice?.status;
    if (balanceDue <= EPSILON) status = 'Pagada';
    else if (amountPaid > 0) status = 'Abonada';

    return { amountPaid, balanceDue, status };
};
