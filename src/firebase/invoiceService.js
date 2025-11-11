// src/firebase/invoiceService.js (CÓDIGO COMPLETO Y CORREGIDO)
import { db } from './config';
import { collection, addDoc, onSnapshot, doc, updateDoc, writeBatch, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const INVOICES_COLLECTION = 'invoices';
const PRODUCTS_COLLECTION = 'products';

// --- ESTA ES LA FUNCIÓN QUE CORREGIMOS ---
export const getInvoices = (callback) => {
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  const q = query(invoicesRef, orderBy("issueDate", "desc"));
  // onSnapshot devuelve la función 'unsubscribe' que necesitamos
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(invoices);
  });
};

// --- EL RESTO DE FUNCIONES DE LA FASE 9 ---

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

export const updateInvoiceStatus = async (invoiceId, status) => {
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    await updateDoc(invoiceRef, { status });
};

export const addInvoiceAndProcessStock = async (invoiceData, saleLocation) => {
    const batch = writeBatch(db);
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
    
    for (const item of invoiceData.items) {
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
    
    batch.set(invoiceRef, invoiceData);
    await batch.commit();
};