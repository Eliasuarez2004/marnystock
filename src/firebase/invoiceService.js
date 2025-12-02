import { db } from './config';
import { collection, addDoc, onSnapshot, doc, updateDoc, writeBatch, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const INVOICES_COLLECTION = 'invoices';
const PRODUCTS_COLLECTION = 'products';

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

// Crea una factura y descuenta el stock (actualizado para incluir saldos)
export const addInvoiceAndProcessStock = async (invoiceData, saleLocation) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));

    // --- ¡ACTUALIZACIÓN IMPORTANTE! ---
    // Añadimos los nuevos campos de saldo al crear la factura
    const fullInvoiceData = {
        ...invoiceData,
        amountPaid: 0,
        balanceDue: invoiceData.total,
    };
    
    for (const item of fullInvoiceData.items) {
        let quantityToDeduct = item.quantity;
        item.batchDetails = [];

        const batchesRef = collection(db, PRODUCTS_COLLECTION, item.productId, 'batches');
        const q = query(batchesRef, orderBy('expiryDate', 'asc'));
        const batchesSnapshot = await getDocs(q);

        for (const batchDoc of batchesSnapshot.docs) {
            if (quantityToDeduct === 0) break;

            const batchData = batchDoc.data();
            const stockField = saleLocation === 'SPS' ? 'quantitySPS' : 'quantityTGU';
            const stockInBatch = batchData[stockField] || 0;

            if (stockInBatch > 0) {
                const quantityTaken = Math.min(quantityToDeduct, stockInBatch);
                
                const batchRefToUpdate = doc(db, PRODUCTS_COLLECTION, item.productId, 'batches', batchDoc.id);
                batch.update(batchRefToUpdate, { [stockField]: stockInBatch - quantityTaken });

                item.batchDetails.push({
                    lotNumber: batchData.lotNumber,
                    quantityTaken: quantityTaken,
                });

                quantityToDeduct -= quantityTaken;
            }
        }

        if (quantityToDeduct > 0) {
            throw new Error(`Stock insuficiente para el producto ${item.name} en la sede ${saleLocation}. Faltan ${quantityToDeduct} unidades.`);
        }
    }
    
    // Guardamos la factura con los campos de saldo inicializados
    batch.set(invoiceRef, fullInvoiceData);
    await batch.commit();
};

// --- ¡NUEVA FUNCIÓN! ---
// Registra un pago y actualiza el saldo de la factura
export const addPaymentToInvoice = async (invoice, paymentData) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoice.id);
    const paymentRef = doc(collection(db, 'invoices', invoice.id, 'payments'));

    // 1. Registrar el nuevo pago en la sub-colección de pagos
    batch.set(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0],
    });

    // 2. Calcular los nuevos totales y el nuevo estado
    const newAmountPaid = (invoice.amountPaid || 0) + Number(paymentData.amount);
    const newBalanceDue = invoice.total - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'Pagada' : 'Abonada';

    // 3. Actualizar la información en el documento principal de la factura
    batch.update(invoiceRef, {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
    });

    // Ejecutar todas las operaciones
    await batch.commit();
};

// --- ¡NUEVA FUNCIÓN! ---
// Obtiene el historial de pagos de una factura específica
export const getInvoicePayments = (invoiceId, callback) => {
    const paymentsRef = collection(db, 'invoices', invoiceId, 'payments');
    const q = query(paymentsRef, orderBy('paymentDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(payments);
    });
};