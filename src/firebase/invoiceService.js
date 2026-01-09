import { db } from './config';
import { collection, doc, writeBatch, onSnapshot, getDoc, getDocs, query, orderBy, limit, updateDoc, where } from 'firebase/firestore';

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

// Crea una factura y descuenta el stock del Kardex
export const addInvoiceAndProcessStock = async (invoiceData, saleLocation) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));

    const fullInvoiceData = {
        ...invoiceData,
        amountPaid: 0,
        balanceDue: invoiceData.total,
    };
    
    for (const item of fullInvoiceData.items) {
        let quantityToDeduct = item.quantity;
        item.batchDetails = [];

        const lotsQuery = query(
            collection(db, INVENTORY_LOTS_COLLECTION),
            where("productId", "==", item.productId),
            orderBy('expiryDate', 'asc')
        );
        const lotsSnapshot = await getDocs(lotsQuery);

        for (const lotDoc of lotsSnapshot.docs) {
            if (quantityToDeduct === 0) break;

            const lotData = lotDoc.data();
            const stockField = saleLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
            const stockInLot = lotData[stockField] || 0;

            if (stockInLot > 0) {
                const quantityTaken = Math.min(quantityToDeduct, stockInLot);
                
                const lotRefToUpdate = doc(db, INVENTORY_LOTS_COLLECTION, lotDoc.id);
                batch.update(lotRefToUpdate, { [stockField]: stockInLot - quantityTaken });

                item.batchDetails.push({ lotId: lotDoc.id, lotNumber: lotData.lotNumber, quantityTaken });
                
                const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
                const movementData = {
                    date: new Date().toISOString(), type: 'SALIDA_VENTA', lotId: lotDoc.id,
                    lotNumber: lotData.lotNumber, productId: item.productId, productName: item.name,
                    fromLocation: saleLocation, quantity: quantityTaken, reason: `Factura ${invoiceData.invoiceNumber}`
                };
                batch.set(movementRef, movementData);

                quantityToDeduct -= quantityTaken;
            }
        }

        if (quantityToDeduct > 0) {
            throw new Error(`Stock insuficiente para ${item.name} en ${saleLocation}. Faltan ${quantityToDeduct} unidades.`);
        }
    }
    
    batch.set(invoiceRef, fullInvoiceData);
    await batch.commit();
};

// --- FUNCIÓN DE PAGO ACTUALIZADA CON LÓGICA DE CENTAVOS ---
export const addPaymentToInvoice = async (invoice, paymentData) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoice.id);
    const paymentRef = doc(collection(db, 'invoices', invoice.id, 'payments'));

    batch.set(paymentRef, {
        ...paymentData,
        paymentDate: new Date().toISOString().split('T')[0],
    });

    // Convertimos todos los valores a centavos para hacer cálculos precisos
    const totalInCents = Math.round(invoice.total * 100);
    const currentAmountPaidInCents = Math.round((invoice.amountPaid || 0) * 100);
    const paymentAmountInCents = Math.round(Number(paymentData.amount) * 100);

    const newAmountPaidInCents = currentAmountPaidInCents + paymentAmountInCents;
    const newBalanceDueInCents = totalInCents - newAmountPaidInCents;

    // Convertimos de vuelta a decimales solo para guardar en la base de datos
    const newAmountPaid = newAmountPaidInCents / 100;
    const newBalanceDue = newBalanceDueInCents / 100;

    // La comparación ahora es con enteros, lo que es 100% preciso
    const newStatus = newBalanceDueInCents <= 0 ? 'Pagada' : 'Abonada';

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

// Anula una factura y devuelve el stock al inventario
export const anullInvoice = async (invoice, reason) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoice.id);

    batch.update(invoiceRef, {
        status: 'Anulada',
        anulledReason: reason,
    });

    if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
            if (item.batchDetails && item.batchDetails.length > 0) {
                for (const detail of item.batchDetails) {
                    const lotRef = doc(db, INVENTORY_LOTS_COLLECTION, detail.lotId);
                    const lotSnap = await getDoc(lotRef);

                    if (lotSnap.exists()) {
                        const lotData = lotSnap.data();
                        const stockField = invoice.saleLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
                        const currentStock = lotData[stockField] || 0;
                        batch.update(lotRef, { [stockField]: currentStock + detail.quantityTaken });

                        const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
                        const movementData = {
                            date: new Date().toISOString(), type: 'ENTRADA_ANULACION', lotId: detail.lotId,
                            lotNumber: detail.lotNumber, productId: item.productId, productName: item.name,
                            toLocation: invoice.saleLocation, quantity: detail.quantityTaken,
                            reason: `Anulación de Factura ${invoice.invoiceNumber}`
                        };
                        batch.set(movementRef, movementData);
                    }
                }
            }
        }
    }

    await batch.commit();
};