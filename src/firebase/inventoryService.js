import { db } from './config';
// Se ha añadido 'getDocs', 'query', 'where' y 'orderBy' necesarios para la función FEFO
import { collection, doc, writeBatch, onSnapshot, getDoc, query, orderBy, addDoc, where, updateDoc, getDocs } from 'firebase/firestore';

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
    const { type, lotId, fromLocation, toLocation, quantity, reason } = movementData;
    
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

// --- ¡NUEVA FUNCIÓN! MANEJA DESCUENTOS FEFO DESDE FACTURACIÓN ---
// Esta función es la que debe ser llamada por invoiceService.js
export const processFEFODiscount = async (movementData) => {
    const { type, productId, fromLocation, quantity, reason } = movementData;
    
    // 1. VALIDACIÓN ESENCIAL
    if (!productId || !fromLocation || !quantity) {
        throw new Error("Datos FEFO incompletos. Se requiere Producto, Sede de Origen y Cantidad.");
    }
    
    // 2. OBTENER LOTES DEL PRODUCTO Y ORDENAR POR VENCIMIENTO (FEFO)
    const stockField = fromLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
    
    const productLotsQuery = query(
        collection(db, "inventory_lots"),
        where("productId", "==", productId),
        where(stockField, ">", 0),
        orderBy("expiryDate", "asc") // FEFO
    );
    
    const lotsSnapshot = await getDocs(productLotsQuery);
    let quantityRemaining = quantity;

    if (lotsSnapshot.empty) {
        throw new Error(`Stock insuficiente. 0 unidades activas en la sede ${fromLocation}.`);
    }

    // 3. DESCONTAR LOTES EN ORDEN FEFO
    const movementRecords = []; // Guardar los movimientos para registrar al final
    const batch = writeBatch(db);

    for (const lotDoc of lotsSnapshot.docs) {
        if (quantityRemaining <= 0) break;

        const lotData = lotDoc.data();
        const lotRef = doc(db, "inventory_lots", lotDoc.id);
        
        const availableStock = lotData[stockField] || 0;
        const quantityToUse = Math.min(quantityRemaining, availableStock);
        
        if (quantityToUse > 0) {
            // 3a. Prepara la actualización del Lote
            batch.update(lotRef, {
                [stockField]: availableStock - quantityToUse
            });

            // 3b. Registra el movimiento en el Kardex (inventory_movements)
            movementRecords.push({
                date: new Date().getTime(),
                type: type,
                lotId: lotDoc.id,
                lotNumber: lotData.lotNumber,
                productId: productId,
                productName: lotData.productName,
                fromLocation: fromLocation,
                quantity: quantityToUse,
                reason: reason // Razón de la Factura (Venta/Bono)
            });
            
            quantityRemaining -= quantityToUse;
        }
    }
    
    // 4. VERIFICACIÓN FINAL Y ESCRITURA
    if (quantityRemaining > 0) {
        throw new Error(`Stock insuficiente. Faltaron ${quantityRemaining} unidades para completar la orden.`);
    }

    // Registrar todos los movimientos de Kardex
    movementRecords.forEach(m => {
        batch.set(doc(collection(db, 'inventory_movements')), m);
    });

    await batch.commit();

    return true;
};

// Actualiza la información de un lote (número de lote y fecha de vencimiento)
export const updateLotInfo = async (lotId, dataToUpdate) => {
    const lotRef = doc(db, 'inventory_lots', lotId);
    await updateDoc(lotRef, dataToUpdate);
};