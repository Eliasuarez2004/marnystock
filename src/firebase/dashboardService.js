import { db } from './config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, startOfDay, subDays } from 'date-fns';

// Función auxiliar que obtiene todos los datos necesarios de una sola vez
const getAllData = async () => {
    // Usamos Promise.all para ejecutar todas las lecturas de la base de datos en paralelo, es mucho más rápido.
    const [productsSnapshot, clientsSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'invoices'))
    ]);

    // Procesamos los productos para incluir sus lotes anidados
    const productsDataPromises = productsSnapshot.docs.map(async (doc) => {
        const product = { id: doc.id, ...doc.data() };
        const batchesSnapshot = await getDocs(collection(db, 'products', doc.id, 'batches'));
        product.batches = batchesSnapshot.docs.map(batchDoc => ({ id: batchDoc.id, ...batchDoc.data() }));
        return product;
    });

    // Esperamos a que todos los productos y sus lotes se hayan procesado
    const products = await Promise.all(productsDataPromises);
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { products, clients, invoices };
};

// Función auxiliar que calcula estadísticas para un rango de fechas específico
const calculateStatsForPeriod = (invoices, startDate, endDate) => {
    // Filtramos las facturas que caen dentro del rango de fechas
    const periodInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
    });
    
    // Calculamos los ingresos totales de las facturas pagadas en ese período
    const totalRevenue = periodInvoices
        .filter(inv => inv.status === 'Pagada')
        .reduce((acc, inv) => acc + inv.total, 0);
        
    // Calculamos el total de cuentas por cobrar (saldo pendiente) de las facturas no pagadas en ese período
    const accountsReceivable = periodInvoices
        .filter(inv => inv.status === 'Pendiente' || inv.status === 'Abonada')
        .reduce((acc, inv) => acc + (inv.balanceDue ?? inv.total), 0);
        
    return { totalRevenue, accountsReceivable };
};

// --- FUNCIÓN PRINCIPAL EXPORTADA ---
// Esta es la función que llamará nuestro Dashboard para obtener todos los datos inteligentes.
export const getSmartDashboardData = async (timeFilter = 'thisMonth') => {
    const { products, clients, invoices } = await getAllData();

    // 1. Definir los rangos de fechas (período actual y período anterior para comparación)
    const now = new Date();
    let currentPeriodStart, currentPeriodEnd, prevPeriodStart, prevPeriodEnd;

    if (timeFilter === 'thisMonth') {
        currentPeriodStart = startOfMonth(now);
        currentPeriodEnd = endOfMonth(now);
        prevPeriodStart = startOfMonth(subMonths(now, 1));
        prevPeriodEnd = endOfMonth(subMonths(now, 1));
    } else if (timeFilter === 'last30days') {
        currentPeriodEnd = startOfDay(now);
        currentPeriodStart = subDays(currentPeriodEnd, 29);
        prevPeriodEnd = subDays(currentPeriodStart, 1);
        prevPeriodStart = subDays(prevPeriodEnd, 29);
    } else { // thisYear
        currentPeriodStart = startOfYear(now);
        currentPeriodEnd = endOfYear(now);
        prevPeriodStart = startOfYear(subYears(now, 1));
        prevPeriodEnd = endOfYear(subYears(now, 1));
    }
    
    // 2. Calcular estadísticas principales y las del período anterior para comparar
    const currentStats = calculateStatsForPeriod(invoices, currentPeriodStart, currentPeriodEnd);
    const prevStats = calculateStatsForPeriod(invoices, prevPeriodStart, prevPeriodEnd);

    // Calcular el porcentaje de cambio en los ingresos
    const revenueChange = prevStats.totalRevenue === 0 
        ? (currentStats.totalRevenue > 0 ? 100 : 0) // Si antes era 0, el cambio es 100% o 0%
        : ((currentStats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100;
    
    // 3. Preparar los datos para el gráfico de ventas del período actual
    const salesByDay = {};
    const periodPaidInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= currentPeriodStart && invDate <= currentPeriodEnd && inv.status === 'Pagada';
    });
    periodPaidInvoices.forEach(inv => {
        const day = inv.issueDate;
        if (!salesByDay[day]) salesByDay[day] = 0;
        salesByDay[day] += inv.total;
    });

    // 4. Calcular datos que no dependen del filtro de tiempo
    const totalAccountsReceivable = invoices
        .filter(inv => inv.status === 'Pendiente' || inv.status === 'Abonada')
        .reduce((acc, inv) => acc + (inv.balanceDue ?? inv.total), 0);
        
    const inventoryValue = products.reduce((acc, prod) => {
        const totalStock = prod.batches?.reduce((sum, b) => sum + (b.quantitySPS || 0) + (b.quantityTGU || 0), 0) || 0;
        return acc + (prod.price * totalStock);
    }, 0);
    
    const totalClients = clients.length;
    
    const lowStockProducts = products
        .map(prod => ({
            ...prod,
            totalStock: prod.batches?.reduce((sum, b) => sum + (b.quantitySPS || 0) + (b.quantityTGU || 0), 0) || 0
        }))
        .filter(prod => prod.totalStock > 0 && prod.totalStock < 10)
        .sort((a, b) => a.totalStock - b.totalStock);
        
    const expiringSoon = { SPS: [], TGU: [] };
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);
    products.forEach(product => {
        product.batches?.forEach(batch => {
            const expiryDate = new Date(batch.expiryDate);
            if (expiryDate >= today && expiryDate <= ninetyDaysFromNow) {
                if (batch.quantitySPS > 0) {
                    expiringSoon.SPS.push({ productName: product.name, lotNumber: batch.lotNumber, expiryDate: batch.expiryDate, quantity: batch.quantitySPS, productId: product.id });
                }
                if (batch.quantityTGU > 0) {
                    expiringSoon.TGU.push({ productName: product.name, lotNumber: batch.lotNumber, expiryDate: batch.expiryDate, quantity: batch.quantityTGU, productId: product.id });
                }
            }
        });
    });
    expiringSoon.SPS.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    expiringSoon.TGU.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // 5. Devolver todo el objeto de datos procesado
    return {
        totalRevenue: currentStats.totalRevenue,
        revenueChange,
        accountsReceivable: totalAccountsReceivable, // Mostramos el total histórico de CxC
        inventoryValue,
        totalClients,
        salesChartData: {
            labels: Object.keys(salesByDay).sort(),
            data: Object.values(Object.fromEntries(Object.entries(salesByDay).sort())),
        },
        lowStockProducts,
        expiringSoon
    };
};