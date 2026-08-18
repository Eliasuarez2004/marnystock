import { db } from './config';
import { 
    collection, addDoc, getDocs, doc, runTransaction, query, 
    orderBy, limit, updateDoc, onSnapshot, where 
} from 'firebase/firestore'; 
import { processFEFODiscount } from './inventoryService';
import { planReversal, stockFieldFor } from '../domain/fefo';
import { applyPayment } from '../domain/billing';

// --- GENERAR NÚMERO DE FACTURA ---
export const getNextInvoiceNumber = async () => {
    const q = query(collection(db, "invoices"), orderBy("invoiceNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    let lastNumber = 0;
    
    if (!querySnapshot.empty) {
        const lastInvoice = querySnapshot.docs[0].data();
        const lastInvoiceStr = lastInvoice.invoiceNumber.replace('F-', '');
        lastNumber = parseInt(lastInvoiceStr, 10);
    }
    
    const nextNumber = lastNumber + 1;
    return `F-${String(nextNumber).padStart(4, '0')}`;
};

// --- CREAR FACTURA Y PROCESAR KARDEX (FEFO) ---
export const addInvoiceAndProcessStock = async (invoiceData, location) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Guardar la factura principal en Firestore
            const invoiceRef = doc(collection(db, "invoices")); 
            transaction.set(invoiceRef, {
                ...invoiceData,
                createdAt: new Date(), // Timestamp para orden interno
            });

            // 2. Procesar cada item para descontar inventario mediante FEFO
            for (const item of invoiceData.items) {
                
                // Determinar tipo de salida para el historial
                const movementType = item.isBonus ? 'SALIDA_BONIFICACION' : 'SALIDA_VENTA';
                
                // Construir razón para el Kardex
                let reasonText = `Factura #${invoiceData.invoiceNumber} del ${invoiceData.issueDate}`;
                if (item.isBonus) {
                    reasonText += ` - Entrega por Bonificación`;
                } else {
                    reasonText += ` - Venta a cliente`;
                }
                
                // Llamamos a la lógica FEFO del servicio de inventario
                await processFEFODiscount({
                    type: movementType, 
                    productId: item.productId,
                    quantity: item.quantity,
                    fromLocation: location,
                    reason: reasonText,
                });
            }
        });
        
        return true;
    } catch (error) {
        console.error("Error al procesar factura:", error);
        throw error;
    }
};

// --- OBTENER FACTURAS EN TIEMPO REAL ---
export const getInvoices = (callback) => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(invoices);
    });
};

// --- OBTENER PAGOS DE UNA FACTURA ---
export const getInvoicePayments = (invoiceId, callback) => {
    const q = query(collection(db, `invoices/${invoiceId}/payments`), orderBy("paymentDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(payments);
    });
};

// --- REGISTRAR UN PAGO / ABONO ---
export const addPaymentToInvoice = async (invoice, paymentData) => {
    const paymentRef = collection(db, `invoices/${invoice.id}/payments`);
    
    // 1. Agregar el documento del pago
    await addDoc(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0], 
        createdAt: new Date()
    });

    // 2. Recalcular saldos y estado (regla en src/domain/billing.js, con pruebas)
    const invoiceRef = doc(db, "invoices", invoice.id);
    await updateDoc(invoiceRef, applyPayment(invoice, paymentData.amount));
};

// --- ANULAR FACTURA Y REVERTIR STOCK ---
export const anullInvoice = async (invoice, reason) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Marcar la factura como anulada
            const invoiceRef = doc(db, "invoices", invoice.id);
            transaction.update(invoiceRef, { 
                status: 'Anulada',
                anulledReason: reason,
                anulledAt: new Date()
            });

            // 2. Devolver stock al inventario
            for (const item of invoice.items) {
                // Al anular no se sabe de qué lote salió cada unidad (FEFO es dinámico):
                // planReversal elige el lote de vencimiento más lejano (src/domain/fefo.js).
                const stockField = stockFieldFor(invoice.saleLocation);
                const q = query(
                    collection(db, "inventory_lots"),
                    where("productId", "==", item.productId),
                    orderBy("expiryDate", "desc")
                );

                const lotSnapshot = await getDocs(q);
                const lots = lotSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                const devolucion = planReversal(lots, { quantity: item.quantity });

                if (devolucion) {
                    const targetLotData = lots.find(l => l.id === devolucion.lotId);

                    // Actualizamos el stock del lote encontrado
                    const lotRef = doc(db, "inventory_lots", devolucion.lotId);
                    transaction.update(lotRef, {
                        [stockField]: (Number(targetLotData[stockField]) || 0) + devolucion.quantity
                    });

                    // Registramos la entrada por devolución en el Kardex
                    const movementRef = doc(collection(db, "inventory_movements"));
                    transaction.set(movementRef, {
                        date: new Date().getTime(),
                        type: 'ENTRADA_DEVOLUCION',
                        lotId: devolucion.lotId,
                        lotNumber: devolucion.lotNumber,
                        productId: item.productId,
                        productName: devolucion.productName,
                        toLocation: invoice.saleLocation,
                        quantity: devolucion.quantity,
                        reason: `Anulación Factura #${invoice.invoiceNumber}: ${reason}`
                    });
                }
            }
        });
        return true;
    } catch (error) {
        console.error("Error anulando factura:", error);
        throw error;
    }
};