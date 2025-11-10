// src/firebase/dashboardService.js
import { db } from './config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export const getDashboardStats = async () => {
    try {
        // Obtener todos los documentos necesarios con Promise.all
        const [productsSnapshot, clientsSnapshot, invoicesSnapshot] = await Promise.all([
            getDocs(collection(db, 'products')),
            getDocs(collection(db, 'clients')),
            getDocs(collection(db, 'invoices'))
        ]);

        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- Cálculos de Métricas ---

        // 1. Ingresos Totales (solo facturas pagadas)
        const totalRevenue = invoicesData
            .filter(inv => inv.status === 'Pagada')
            .reduce((acc, inv) => acc + inv.total, 0);

        // 2. Cuentas por Cobrar (solo facturas pendientes)
        const accountsReceivable = invoicesData
            .filter(inv => inv.status === 'Pendiente')
            .reduce((acc, inv) => acc + inv.total, 0);

        // 3. Valor del Inventario
        const inventoryValue = productsData
            .reduce((acc, prod) => acc + (prod.price * prod.stock), 0);
        
        // 4. Total de Clientes
        const totalClients = clientsData.length;

        // 5. Productos con Bajo Stock (ej. stock < 10)
        const lowStockProducts = productsData
            .filter(prod => prod.stock < 10)
            .sort((a, b) => a.stock - b.stock); // Ordenar por los más bajos primero

        // 6. Facturas Recientes
        const recentInvoices = invoicesData
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)) // Ordenar por fecha más reciente
            .slice(0, 5); // Obtener las últimas 5

        return {
            totalRevenue,
            accountsReceivable,
            inventoryValue,
            totalClients,
            lowStockProducts,
            recentInvoices,
        };

    } catch (error) {
        console.error("Error al obtener las estadísticas del dashboard:", error);
        throw error; // Propagar el error para que el componente lo maneje
    }
};