// src/firebase/dashboardService.js (ACTUALIZADO CON VENCIMIENTOS)
import { db } from './config';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore'; // onSnapshot añadido

export const getDashboardDataStream = (callback) => {
    // Usaremos onSnapshot para que el dashboard sea en tiempo real
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), async (productsSnapshot) => {
        const productsDataPromises = productsSnapshot.docs.map(async (doc) => {
            const product = { id: doc.id, ...doc.data() };
            const batchesSnapshot = await getDocs(collection(db, 'products', doc.id, 'batches'));
            product.batches = batchesSnapshot.docs.map(batchDoc => ({ id: batchDoc.id, ...batchDoc.data() }));
            return product;
        });
        const productsData = await Promise.all(productsDataPromises);

        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
        
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- Cálculos (sin cambios) ---
        const totalRevenue = invoicesData.filter(inv => inv.status === 'Pagada').reduce((acc, inv) => acc + inv.total, 0);
        const accountsReceivable = invoicesData.filter(inv => inv.status === 'Pendiente').reduce((acc, inv) => acc + inv.total, 0);
        const inventoryValue = productsData.reduce((acc, prod) => acc + (prod.price * (prod.batches?.reduce((sum, b) => sum + b.quantitySPS + b.quantityTGU, 0) || 0)), 0);
        const totalClients = clientsData.length;
        const lowStockProducts = productsData.filter(prod => {
            const totalStock = prod.batches?.reduce((sum, b) => sum + b.quantitySPS + b.quantityTGU, 0) || 0;
            return totalStock > 0 && totalStock < 10;
        }).sort((a, b) => a.batches.reduce((s, bt) => s + bt.quantitySPS + bt.quantityTGU, 0) - b.batches.reduce((s, bt) => s + bt.quantitySPS + bt.quantityTGU, 0));
        const recentInvoices = invoicesData.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)).slice(0, 5);
        
        // --- ¡NUEVA LÓGICA DE VENCIMIENTOS! ---
        const expiringSoon = { SPS: [], TGU: [] };
        const today = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);

        productsData.forEach(product => {
            product.batches?.forEach(batch => {
                const expiryDate = new Date(batch.expiryDate);
                if (expiryDate > today && expiryDate <= ninetyDaysFromNow) {
                    if (batch.quantitySPS > 0) {
                        expiringSoon.SPS.push({ productName: product.name, lotNumber: batch.lotNumber, expiryDate: batch.expiryDate, quantity: batch.quantitySPS });
                    }
                    if (batch.quantityTGU > 0) {
                        expiringSoon.TGU.push({ productName: product.name, lotNumber: batch.lotNumber, expiryDate: batch.expiryDate, quantity: batch.quantityTGU });
                    }
                }
            });
        });
        
        // Ordenar por fecha de vencimiento más próxima
        expiringSoon.SPS.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        expiringSoon.TGU.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        // Llamar al callback con todos los datos procesados
        callback({
            totalRevenue, accountsReceivable, inventoryValue, totalClients,
            lowStockProducts, recentInvoices, expiringSoon
        });
    });
    
    // Devolvemos la función de desuscripción para limpiar el listener
    return unsubscribeProducts;
};