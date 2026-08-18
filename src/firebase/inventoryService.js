import { db } from './config';
// Se ha añadido 'getDocs', 'query', 'where' y 'orderBy' necesarios para la función FEFO
import { collection, doc, writeBatch, onSnapshot, getDoc, query, orderBy, where, updateDoc, getDocs } from 'firebase/firestore';
import { planFEFODiscount, stockFieldFor } from '../domain/fefo';

// Obtiene todos los lotes de inventario en tiempo real
export const getInventoryLotsStream = (callback) => {
    const q = query(collection(db, 'inventory_lots'), orderBy('expiryDate', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const lots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(lots);
    });
};

// Obtiene el historial de movimientos para un lote específico
export const getLotHistoryStream = (lotId, callback) => {
    const q = query(collection(db, 'inventory_movements'), where('lotId', '==', lotId), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const movements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(movements);
    });
};

// Crea múltiples documentos de lote para una nueva entrada de compra
export const addMultiProductEntry = async (entryData) => {
    const { lotNumber, supplier, items } = entryData;
    const batch = writeBatch(db);

    items.forEach(item => {
        const newLotRef = doc(collection(db, 'inventory_lots'));
        const lotData = {
            productId: item.productId,
            productName: item.name,
            lotNumber,
            expiryDate: item.expiryDate, 
            supplier,
            stockSPS: Number(item.quantitySPS) || 0,
            stockTGU: Number(item.quantityTGU) || 0,
        };
        batch.set(newLotRef, lotData);
        
        const movementRef = doc(collection(db, 'inventory_movements'));
        const movementData = {
            date: new Date().toISOString(),
            type: 'ENTRADA_COMPRA',
            lotId: newLotRef.id,
            lotNumber,
            productId: item.productId,
            productName: item.name,
            toLocation: 'BODEGA', // Asumimos que la entrada va a la bodega
            quantity: (Number(item.quantitySPS) || 0) + (Number(item.quantityTGU) || 0),
            reason: `Compra a ${supplier}`
        };
        batch.set(movementRef, movementData);
    });

    await batch.commit();
};


// --- FUNCIÓN EXISTENTE: MANEJA MOVIMIENTOS MANUALES DE UN LOTE ESPECÍFICO ---
export const createInventoryMovement = async (movementData) => {
    const { lotId, fromLocation, toLocation, quantity } = movementData;
    
    // Validaciones para esta función manual (siempre requiere LotId)
    if (!lotId) throw new Error("createInventoryMovement requiere lotId.");
    if (fromLocation && (fromLocation === toLocation)) throw new Error("Origen y Destino no pueden ser iguales.");

    const batch = writeBatch(db);
    const lotRef = doc(db, "inventory_lots", lotId);
    const lotSnap = await getDoc(lotRef);

    if (!lotSnap.exists()) { throw new Error("El lote seleccionado ya no existe."); }
    
    const lotData = lotSnap.data();
    const updates = {};
    let fromStockField, toStockField;
    
    // Lógica de Descuento (Salida)
    if (fromLocation) {
        fromStockField = fromLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
        if ((lotData[fromStockField] || 0) < quantity) {
            throw new Error(`Stock insuficiente en el lote. Solo quedan ${lotData[fromStockField] || 0} unidades en ${fromLocation}.`);
        }
        updates[fromStockField] = (lotData[fromStockField] || 0) - quantity;
    }
    // Lógica de Incremento (Entrada)
    if (toLocation) {
        toStockField = toLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
        updates[toStockField] = (lotData[toStockField] || 0) + quantity;
    }

    batch.update(lotRef, updates);

    const movementRef = doc(collection(db, 'inventory_movements'));
    batch.set(movementRef, {
        ...movementData,
        productName: lotData.productName,
        lotNumber: lotData.lotNumber,
        date: new Date().getTime(), // Usamos timestamp para ordenar mejor
    });

    await batch.commit();
};

// --- DESCUENTO FEFO DESDE FACTURACIÓN ---
// El reparto entre lotes lo decide planFEFODiscount (src/domain/fefo.js, con pruebas);
// aquí solo se lee el inventario y se escribe el resultado.
export const processFEFODiscount = async (movementData) => {
    const { type, productId, fromLocation, quantity, reason } = movementData;

    if (!productId) {
        throw new Error("Datos FEFO incompletos. Se requiere Producto, Sede de Origen y Cantidad.");
    }

    const stockField = stockFieldFor(fromLocation);

    const productLotsQuery = query(
        collection(db, "inventory_lots"),
        where("productId", "==", productId),
        where(stockField, ">", 0),
        orderBy("expiryDate", "asc") // FEFO
    );

    const lotsSnapshot = await getDocs(productLotsQuery);
    const lots = lotsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Lanza si el stock no alcanza: nada se escribe.
    const plan = planFEFODiscount(lots, { location: fromLocation, quantity });

    const batch = writeBatch(db);
    const stockPorLote = new Map(lots.map(l => [l.id, Number(l[stockField]) || 0]));

    plan.forEach(asignacion => {
        batch.update(doc(db, "inventory_lots", asignacion.lotId), {
            [stockField]: stockPorLote.get(asignacion.lotId) - asignacion.quantity
        });

        batch.set(doc(collection(db, 'inventory_movements')), {
            date: new Date().getTime(),
            type: type,
            lotId: asignacion.lotId,
            lotNumber: asignacion.lotNumber,
            productId: productId,
            productName: asignacion.productName,
            fromLocation: fromLocation,
            quantity: asignacion.quantity,
            reason: reason // Razón de la Factura (Venta/Bono)
        });
    });

    await batch.commit();

    return true;
};

// Actualiza la información de un lote (número de lote y fecha de vencimiento)
export const updateLotInfo = async (lotId, dataToUpdate) => {
    const lotRef = doc(db, 'inventory_lots', lotId);
    await updateDoc(lotRef, dataToUpdate);
};