import { db } from './config';
import { 
    collection, addDoc, getDocs, doc, runTransaction, query, 
    orderBy, limit, updateDoc, onSnapshot 
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

// --- CREAR FACTURA Y MOVER STOCK (LOGICA CON TRAZABILIDAD DE BONO) ---
export const addInvoiceAndProcessStock = async (invoiceData, location) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Guardar la factura principal
            const invoiceRef = doc(collection(db, "invoices")); 
            transaction.set(invoiceRef, {
                ...invoiceData,
                createdAt: new Date(),
            });

            // 2. Procesar cada item para descontar inventario
            for (const item of invoiceData.items) {
                
                // Si el item es bono, el tipo de movimiento en inventario debe ser diferente
                const movementType = item.isBonus ? 'SALIDA_BONIFICACION' : 'SALIDA_VENTA';
                
                let reasonText = `Factura #${invoiceData.invoiceNumber} (${invoiceData.saleType})`;
                if (item.isBonus) {
                    reasonText += ` - Entrega por Bonificación`;
                } else {
                    reasonText += ` - Venta a cliente`;
                }
                
                // Llamamos a la lógica FEFO que creamos anteriormente en inventoryService
                await processFEFODiscount({
                    type: movementType, // <--- Aquí va 'SALIDA_BONIFICACION' o 'SALIDA_VENTA'
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

// --- OBTENER FACTURAS ---
export const getInvoices = (callback) => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(invoices);
    });
};

// --- GESTIÓN DE PAGOS ---
export const getInvoicePayments = (invoiceId, callback) => {
    const q = query(collection(db, `invoices/${invoiceId}/payments`), orderBy("paymentDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(payments);
    });
};

export const addPaymentToInvoice = async (invoice, paymentData) => {
    const paymentRef = collection(db, `invoices/${invoice.id}/payments`);
    
    await addDoc(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0], 
        createdAt: new Date()
    });

    const newAmountPaid = (invoice.amountPaid || 0) + Number(paymentData.amount);
    const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
    
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
            const invoiceRef = doc(db, "invoices", invoice.id);
            transaction.update(invoiceRef, { 
                status: 'Anulada',
                anulledReason: reason,
                anulledAt: new Date()
            });

            // En devoluciones no separamos bono de venta en el tipo, 
            // todo entra como DEVOLUCION para simplificar el stock.
            for (const item of invoice.items) {
                // Aquí usamos createInventoryMovement si tenemos el lotId guardado en el item de la factura,
                // de lo contrario, tendríamos que buscar dónde devolverlo. 
                // Por ahora, asumimos que createInventoryMovement maneja la lógica básica.
                // NOTA: Si processFEFODiscount NO soporta entradas, hay que usar otra función.
                // Asumiendo la lógica previa:
                /* 
                await createInventoryMovement({ ... }); 
                */
            }
        });
    } catch (error) {
        console.error("Error anulando factura:", error);
        throw error;
    }
};