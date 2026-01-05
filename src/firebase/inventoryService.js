// src/firebase/inventoryService.js (ACTUALIZADO)
import { db } from './config';
import { collection, doc, writeBatch, onSnapshot, getDoc, query, orderBy, addDoc, where } from 'firebase/firestore';

// Obtiene todos los lotes de inventario, ordenados por fecha de vencimiento (FEFO)
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

// --- ¡NUEVA FUNCIÓN PARA ENTRADAS MULTI-PRODUCTO! ---
// Crea múltiples documentos de lote, uno por cada producto en la entrada.
export const addMultiProductEntry = async (entryData) => {
    const { lotNumber, expiryDate, supplier, items } = entryData;
    const batch = writeBatch(db);

    // Por cada producto en la lista de entrada...
    items.forEach(item => {
        // ...creamos un nuevo documento en la colección 'inventory_lots'
        const newLotRef = doc(collection(db, 'inventory_lots'));
        const lotData = {
            productId: item.productId,
            productName: item.name,
            lotNumber,
            expiryDate,
            supplier,
            stockSPS: Number(item.quantitySPS) || 0,
            stockTGU: Number(item.quantityTGU) || 0,
        };
        batch.set(newLotRef, lotData);
        
        // Y registramos el movimiento inicial en el historial
        const movementRef = doc(collection(db, 'inventory_movements'));
        const movementData = {
            date: new Date().toISOString(),
            type: 'ENTRADA_COMPRA',
            lotId: newLotRef.id, // Hacemos referencia al nuevo lote
            lotNumber,
            productId: item.productId,
            productName: item.name,
            toLocation: 'BODEGA', // Origen genérico
            quantity: (Number(item.quantitySPS) || 0) + (Number(item.quantityTGU) || 0),
            reason: `Compra a ${supplier}`
        };
        batch.set(movementRef, movementData);
    });

    await batch.commit();
};

// Maneja todos los movimientos de un LOTE EXISTENTE
export const createInventoryMovement = async (movementData) => {
    const { type, lotId, fromLocation, toLocation, quantity, reason } = movementData;
    
    const batch = writeBatch(db);
    const lotRef = doc(db, "inventory_lots", lotId);
    const lotSnap = await getDoc(lotRef);

    if (!lotSnap.exists()) {
        throw new Error("El lote seleccionado ya no existe.");
    }
    
    const lotData = lotSnap.data();
    const updates = {};
    let fromStockField, toStockField;
    
    // Determinar campos de stock y validar
    if (fromLocation) {
        fromStockField = fromLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
        if ((lotData[fromStockField] || 0) < quantity) {
            throw new Error(`Stock insuficiente en el lote. Solo quedan ${lotData[fromStockField] || 0} unidades en ${fromLocation}.`);
        }
        updates[fromStockField] = (lotData[fromStockField] || 0) - quantity;
    }
    if (toLocation) {
        toStockField = toLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
        updates[toStockField] = (lotData[toStockField] || 0) + quantity;
    }

    // Aplicar la actualización de stock al lote
    batch.update(lotRef, updates);

    // Registrar el movimiento en el historial (Kardex)
    const movementRef = doc(collection(db, 'inventory_movements'));
    batch.set(movementRef, {
        ...movementData,
        productName: lotData.productName,
        lotNumber: lotData.lotNumber,
        date: new Date().toISOString()
    });

    await batch.commit();
};