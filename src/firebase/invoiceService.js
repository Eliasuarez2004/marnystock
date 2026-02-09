// --- CORRECCIÓN CLAVE: IMPORTAR onSnapshot y query/collection, etc., al inicio ---
import { db } from './config';
import { 
    collection, addDoc, getDocs, doc, runTransaction, query, 
    orderBy, limit, updateDoc, onSnapshot // <--- AÑADIDO onSnapshot
} from 'firebase/firestore'; 
import { processFEFODiscount } from './inventoryService';


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

// --- CREAR FACTURA Y MOVER STOCK (LÓGICA ACTUALIZADA) ---
export const addInvoiceAndProcessStock = async (invoiceData, location) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Guardar la factura en la colección 'invoices'
            const invoiceRef = doc(collection(db, "invoices")); 
            transaction.set(invoiceRef, {
                ...invoiceData,
                createdAt: new Date(),
                amountPaid: 0,
                balanceDue: invoiceData.total
            });

            // 2. Procesar cada item para descontar inventario
            for (const item of invoiceData.items) {
                
                const movementType = item.isBonus ? 'SALIDA_BONIFICACION' : 'SALIDA_VENTA';
                
                let reasonText = `Factura #${invoiceData.invoiceNumber}`;
                if (item.isBonus) {
                    reasonText += ` (Bonificación - Desc: ${item.discountRate}%)`;
                } else {
                    reasonText += ` (Venta Regular)`;
                }
                
                await processFEFODiscount({ // <--- ¡CAMBIADO!
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

// --- OBTENER FACTURAS (CORREGIDO) ---
export const getInvoices = (callback) => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    
    // --- USO DIRECTO DE onSnapshot IMPORTADO ARRIBA ---
    return onSnapshot(q, (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(invoices);
    });
};

// --- GESTIÓN DE PAGOS (CORREGIDO) ---
export const getInvoicePayments = (invoiceId, callback) => {
    
    // --- USO DIRECTO DE onSnapshot IMPORTADO ARRIBA ---
    const q = query(collection(db, `invoices/${invoiceId}/payments`), orderBy("paymentDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(payments);
    });
};

export const addPaymentToInvoice = async (invoice, paymentData) => {
    const paymentRef = collection(db, `invoices/${invoice.id}/payments`);
    
    // 1. Agregar el pago
    await addDoc(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0], 
        createdAt: new Date()
    });

    // 2. Actualizar saldo de la factura
    const newAmountPaid = (invoice.amountPaid || 0) + Number(paymentData.amount);
    const newBalanceDue = invoice.total - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newBalanceDue <= 0.01) newStatus = 'Pagada';
    else if (newAmountPaid > 0) newStatus = 'Abonada';

    const invoiceRef = doc(db, "invoices", invoice.id);
    await updateDoc(invoiceRef, {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus
    });
};

// --- ANULAR FACTURA ---
export const anullInvoice = async (invoice, reason) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Cambiar estado factura
            const invoiceRef = doc(db, "invoices", invoice.id);
            transaction.update(invoiceRef, { 
                status: 'Anulada',
                anulledReason: reason,
                anulledAt: new Date()
            });

            // 2. Devolver stock (Reverse logic)
            for (const item of invoice.items) {
                await createInventoryMovement({
                    type: 'ENTRADA_DEVOLUCION', 
                    productId: item.productId,
                    quantity: item.quantity,
                    toLocation: invoice.saleLocation,
                    reason: `Anulación Factura #${invoice.invoiceNumber}: ${reason}`
                });
            }
        });
    } catch (error) {
        console.error("Error anulando factura:", error);
        throw error;
    }
};