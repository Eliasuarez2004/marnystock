// Reglas de inventario, sin Firestore.
// Aquí vive la decisión (de qué lote sale cada unidad); el servicio solo la escribe.

/** Campo de stock que corresponde a cada sucursal. */
export const stockFieldFor = (location) => (location === 'SPS' ? 'stockSPS' : 'stockTGU');

const stockOf = (lot, stockField) => Number(lot?.[stockField]) || 0;

// Orden FEFO: primero el que vence antes. Las fechas son 'YYYY-MM-DD', comparables como texto.
const byExpiryAsc = (a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate));

/**
 * Reparte una salida entre lotes siguiendo FEFO (first-expired, first-out).
 *
 * @param {Array} lots  lotes del producto (se filtran los que no tienen stock en la sucursal)
 * @param {{location: 'SPS'|'TGU', quantity: number}} salida
 * @returns {Array<{lotId, lotNumber, productName, quantity}>} un renglón por lote tocado
 * @throws si faltan datos o el stock no alcanza
 */
export const planFEFODiscount = (lots, { location, quantity } = {}) => {
    if (!location || !quantity) {
        throw new Error('Datos FEFO incompletos. Se requiere Sede de Origen y Cantidad.');
    }
    if (quantity < 0) throw new Error('La cantidad no puede ser negativa.');

    const stockField = stockFieldFor(location);
    const disponibles = (lots || [])
        .filter((lot) => stockOf(lot, stockField) > 0)
        .sort(byExpiryAsc);

    if (disponibles.length === 0) {
        throw new Error(`Stock insuficiente. 0 unidades activas en la sede ${location}.`);
    }

    const plan = [];
    let pendiente = quantity;

    for (const lot of disponibles) {
        if (pendiente <= 0) break;

        const usar = Math.min(pendiente, stockOf(lot, stockField));
        if (usar <= 0) continue;

        plan.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            productName: lot.productName,
            quantity: usar,
        });
        pendiente -= usar;
    }

    if (pendiente > 0) {
        throw new Error(`Stock insuficiente. Faltaron ${pendiente} unidades para completar la orden.`);
    }

    return plan;
};

/**
 * Lote al que vuelven las unidades cuando se anula una factura.
 *
 * FEFO es dinámico: al anular ya no se sabe de qué lote salió cada unidad, así que se devuelve
 * al de vencimiento más lejano (nunca a uno que esté por vencer, que sería stock incobrable).
 * Es una decisión consciente y está documentada como límite conocido en el README.
 *
 * @returns {{lotId, lotNumber, productName, quantity}|null} null si el producto ya no tiene lotes
 */
export const planReversal = (lots, { quantity } = {}) => {
    if (!quantity || quantity <= 0) throw new Error('La cantidad a devolver debe ser mayor que cero.');

    const candidatos = [...(lots || [])].sort(byExpiryAsc);
    const destino = candidatos[candidatos.length - 1];
    if (!destino) return null;

    return {
        lotId: destino.id,
        lotNumber: destino.lotNumber,
        productName: destino.productName,
        quantity,
    };
};
