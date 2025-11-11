// src/firebase/reportingService.js
import { db } from './config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const getComprehensiveReportData = async () => {
    // Obtenemos todos los datos necesarios de una sola vez
    const invoicesQuery = query(collection(db, 'invoices'), where('status', '==', 'Pagada'));
    const [paidInvoicesSnapshot, clientsSnapshot, productsSnapshot] = await Promise.all([
        getDocs(invoicesQuery),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'products'))
    ]);

    const paidInvoices = paidInvoicesSnapshot.docs.map(doc => doc.data());
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- 1. Top Clientes por Monto de Compra ---
    const clientSales = {};
    paidInvoices.forEach(invoice => {
        if (!clientSales[invoice.clientId]) {
            clientSales[invoice.clientId] = { name: invoice.clientName, totalAmount: 0 };
        }
        clientSales[invoice.clientId].totalAmount += invoice.total;
    });
    const topClients = Object.values(clientSales).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);

    // --- 2. Top Productos por Cantidad Vendida ---
    const productSales = {};
    paidInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { name: item.name, totalQuantity: 0 };
            }
            productSales[item.productId].totalQuantity += item.quantity;
        });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

    // --- 3. Ventas por Mes y Año ---
    const monthlySales = {};
    const yearlySales = {};
    paidInvoices.forEach(invoice => {
        const date = new Date(invoice.issueDate);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const yearMonthKey = `${year}-${month}`;

        // Acumular por mes
        if (!monthlySales[yearMonthKey]) monthlySales[yearMonthKey] = 0;
        monthlySales[yearMonthKey] += invoice.total;

        // Acumular por año
        if (!yearlySales[year]) yearlySales[year] = 0;
        yearlySales[year] += invoice.total;
    });

    // --- 4. Ubicaciones de Clientes para el Mapa ---
    const clientLocations = clients.map(client => ({
        name: client.name,
        address: client.address
    }));

    return { topClients, topProducts, monthlySales, yearlySales, clientLocations };
};