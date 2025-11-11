// src/firebase/inventoryMovementService.js
import { db } from './config';
import { collection, doc, writeBatch, getDocs, query, orderBy, addDoc } from 'firebase/firestore';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'inventoryMovements';

export const createInventoryMovement = async (movementData) => {
    const { productId, type, fromLocation, toLocation, quantity, reason, productName } = movementData;
    const batch = writeBatch(db);
    let quantityToProcess = quantity;

    // --- Lógica de deducción FEFO (similar a la de facturación) ---
    const batchesRef = collection(db, PRODUCTS_COLLECTION, productId, 'batches');
    const q = query(batchesRef, orderBy('expiryDate', 'asc'));
    const batchesSnapshot = await getDocs(q);
    
    const stockFieldFrom = fromLocation === 'SPS' ? 'quantitySPS' : 'quantityTGU';

    for (const batchDoc of batchesSnapshot.docs) {
        if (quantityToProcess === 0) break;
        const batchData = batchDoc.data();
        const stockInBatch = batchData[stockFieldFrom] || 0;

        if (stockInBatch > 0) {
            const quantityTaken = Math.min(quantityToProcess, stockInBatch);
            const batchRefToUpdate = doc(db, PRODUCTS_COLLECTION, productId, 'batches', batchDoc.id);

            // Deducir del origen
            batch.update(batchRefToUpdate, { [stockFieldFrom]: stockInBatch - quantityTaken });
            
            // Si es un traslado, sumar al destino
            if (type === 'TRASLADO') {
                const stockFieldTo = toLocation === 'SPS' ? 'quantitySPS' : 'quantityTGU';
                const currentStockTo = batchData[stockFieldTo] || 0;
                batch.update(batchRefToUpdate, { [stockFieldTo]: currentStockTo + quantityTaken });
            }
            
            quantityToProcess -= quantityTaken;
        }
    }
    if (quantityToProcess > 0) throw new Error(`Stock insuficiente en ${fromLocation}.`);

    // --- Registrar el movimiento ---
    const movementLog = { ...movementData, date: new Date().toISOString() };
    const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
    batch.set(movementRef, movementLog);

    await batch.commit();
};