// src/firebase/inventoryService.js (VERSIÓN FINAL Y COMPLETA)
import { db } from './config';
import { collection, doc, writeBatch, onSnapshot, getDoc, query, orderBy, addDoc, where, updateDoc } from 'firebase/firestore';

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
    const { lotNumber, supplier, items } = entryData; // Ya no necesitamos expiryDate aquí
    const batch = writeBatch(db);

    items.forEach(item => {
        const newLotRef = doc(collection(db, 'inventory_lots'));
        const lotData = {
            productId: item.productId,
            productName: item.name,
            lotNumber,
            expiryDate: item.expiryDate, // <-- ¡NUEVO! Usamos la fecha de cada item
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
            toLocation: 'BODEGA',
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

    batch.update(lotRef, updates);

    const movementRef = doc(collection(db, 'inventory_movements'));
    batch.set(movementRef, {
        ...movementData,
        productName: lotData.productName,
        lotNumber: lotData.lotNumber,
        date: new Date().toISOString()
    });

    await batch.commit();
};

// --- ¡NUEVA FUNCIÓN AÑADIDA! ---
// Actualiza la información de un lote (número de lote y fecha de vencimiento)
export const updateLotInfo = async (lotId, dataToUpdate) => {
    const lotRef = doc(db, 'inventory_lots', lotId);
    await updateDoc(lotRef, dataToUpdate);
};