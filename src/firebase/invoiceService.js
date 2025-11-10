// src/firebase/invoiceService.js
import { db } from './config';
import { collection, addDoc, onSnapshot, doc, updateDoc, writeBatch, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const INVOICES_COLLECTION = 'invoices';
const PRODUCTS_COLLECTION = 'products';

// Función para obtener el siguiente número de factura
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

// CREATE INVOICE y UPDATE STOCK
export const addInvoice = async (invoiceData) => {
    const batch = writeBatch(db);

    // 1. Añadir la nueva factura al batch
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
    batch.set(invoiceRef, invoiceData);

    // 2. Actualizar el stock de cada producto en el batch
    for (const item of invoiceData.items) {
        const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
            const currentStock = productSnap.data().stock;
            const newStock = currentStock - item.quantity;
            batch.update(productRef, { stock: newStock });
        } else {
            throw new Error(`Producto con ID ${item.productId} no encontrado.`);
        }
    }

    // 3. Ejecutar todas las operaciones del batch
    await batch.commit();
};

// READ (en tiempo real)
export const getInvoices = (callback) => {
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  const q = query(invoicesRef, orderBy("issueDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(invoices);
  });
};

// UPDATE STATUS
export const updateInvoiceStatus = async (invoiceId, status) => {
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    await updateDoc(invoiceRef, { status });
};