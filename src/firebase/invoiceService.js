import { db } from './config';
import { collection, doc, writeBatch, onSnapshot, getDoc, query, orderBy, limit, getDocs, where, addDoc } from 'firebase/firestore';

const INVOICES_COLLECTION = 'invoices';
const INVENTORY_LOTS_COLLECTION = 'inventory_lots';
const MOVEMENTS_COLLECTION = 'inventory_movements';

// Obtiene todas las facturas en tiempo real
export const getInvoices = (callback) => {
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  const q = query(invoicesRef, orderBy("issueDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(invoices);
  });
};

// Obtiene el siguiente número de factura correlativo
export const getNextInvoiceNumber = async () => {
    const invoicesRef = collection(db, INVOICES_COLLECTION);
    const q = query(invoicesRef, orderBy("invoiceNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return "F-0001";
    }

    const lastInvoice = querySnapshot.docs[0].data();
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `F-${String(nextNumber).padStart(4, '0')}`;
};

// --- FUNCIÓN addInvoiceAndProcessStock RECONSTRUIDA PARA KARDEX ---
export const addInvoiceAndProcessStock = async (invoiceData, saleLocation) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));

    // Añadimos los campos de saldo al crear la factura
    const fullInvoiceData = {
        ...invoiceData,
        amountPaid: 0,
        balanceDue: invoiceData.total,
    };
    
    for (const item of fullInvoiceData.items) {
        let quantityToDeduct = item.quantity;
        item.batchDetails = [];

        // 1. Buscamos en la nueva colección 'inventory_lots'
        const lotsQuery = query(
            collection(db, INVENTORY_LOTS_COLLECTION),
            where("productId", "==", item.productId), // Lotes para este producto
            orderBy('expiryDate', 'asc')              // Ordenados por vencimiento (FEFO)
        );
        const lotsSnapshot = await getDocs(lotsQuery);

        // 2. Iteramos sobre los lotes encontrados para descontar el stock
        for (const lotDoc of lotsSnapshot.docs) {
            if (quantityToDeduct === 0) break;

            const lotData = lotDoc.data();
            const stockField = saleLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
            const stockInLot = lotData[stockField] || 0;

            if (stockInLot > 0) {
                const quantityTaken = Math.min(quantityToDeduct, stockInLot);
                
                // Actualizamos el stock en el lote específico
                const lotRefToUpdate = doc(db, INVENTORY_LOTS_COLLECTION, lotDoc.id);
                batch.update(lotRefToUpdate, { [stockField]: stockInLot - quantityTaken });

                // Registramos el detalle para la trazabilidad en la factura
                item.batchDetails.push({
                    lotId: lotDoc.id,
                    lotNumber: lotData.lotNumber,
                    quantityTaken: quantityTaken,
                });
                
                // Registramos el movimiento en el Kardex
                const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
                const movementData = {
                    date: new Date().toISOString(),
                    type: 'SALIDA_VENTA',
                    lotId: lotDoc.id,
                    lotNumber: lotData.lotNumber,
                    productId: item.productId,
                    productName: item.name,
                    fromLocation: saleLocation,
                    quantity: quantityTaken,
                    reason: `Factura ${invoiceData.invoiceNumber}`
                };
                batch.set(movementRef, movementData);

                quantityToDeduct -= quantityTaken;
            }
        }

        if (quantityToDeduct > 0) {
            throw new Error(`Stock insuficiente para ${item.name} en ${saleLocation}. Faltan ${quantityToDeduct} unidades.`);
        }
    }
    
    // Guardamos la factura con la información completa
    batch.set(invoiceRef, fullInvoiceData);
    await batch.commit();
};


// Registra un pago y actualiza el saldo de la factura
export const addPaymentToInvoice = async (invoice, paymentData) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoice.id);
    const paymentRef = doc(collection(db, 'invoices', invoice.id, 'payments'));

    batch.set(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0],
    });

    // Usamos el saldo actual calculado para evitar errores con datos antiguos
    const currentBalance = invoice.balanceDue ?? invoice.total;
    const currentPaid = invoice.amountPaid || 0;

    const newAmountPaid = currentPaid + Number(paymentData.amount);
    const newBalanceDue = invoice.total - newAmountPaid;
    const newStatus = newBalanceDue <= 0.001 ? 'Pagada' : 'Abonada'; // Usamos un margen pequeño por errores de flotantes

    batch.update(invoiceRef, {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
    });

    await batch.commit();
};


// Obtiene el historial de pagos de una factura específica
export const getInvoicePayments = (invoiceId, callback) => {
    const paymentsRef = collection(db, 'invoices', invoiceId, 'payments');
    const q = query(paymentsRef, orderBy('paymentDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(payments);
    });
};