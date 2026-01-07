import { db } from './config';
import { collection, getDocs } from 'firebase/firestore';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfDay } from 'date-fns';

// Función auxiliar que obtiene todos los datos necesarios de una sola vez
const getAllData = async () => {
    // Usamos Promise.all para ejecutar todas las lecturas de la base de datos en paralelo
    const [invoicesSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'clients')),
    ]);

    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { invoices, clients };
};

// --- FUNCIÓN PRINCIPAL EXPORTADA ---
export const getAdvancedReportData = async (timeFilter = 'thisMonth') => {
    const { invoices, clients } = await getAllData();

    // 1. Definir el rango de fechas según el filtro seleccionado
    const now = new Date();
    let startDate, endDate;
    if (timeFilter === 'thisMonth') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    } else if (timeFilter === 'thisYear') {
        startDate = startOfYear(now);
        endDate = endOfYear(now);
    } else { // 'last30days'
        endDate = startOfDay(now);
        startDate = subDays(endDate, 29);
    }
    
    // Filtramos las facturas que caen dentro del período de tiempo seleccionado
    const periodInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
    });
    
    // --- CÁLCULOS DE VENTAS ---
    const salesByMonth = {};
    const salesByYear = {};
    const salesByLocation = { SPS: 0, TGU: 0 };
    
    // Solo consideramos facturas pagadas para los reportes de ventas
    periodInvoices.filter(i => i.status === 'Pagada').forEach(inv => {
        const date = new Date(inv.issueDate);
        const year = date.getFullYear();
        const monthKey = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + inv.total;
        salesByYear[year] = (salesByYear[year] || 0) + inv.total;
        
        if (inv.saleLocation === 'SPS') {
            salesByLocation.SPS += inv.total;
        } else if (inv.saleLocation === 'TGU') {
            salesByLocation.TGU += inv.total;
        }
    });

    // --- CÁLCULOS DE PRODUCTOS ---
    const productPerformance = {};
    periodInvoices.forEach(inv => {
        // Obtenemos la información del cliente para la ubicación
        const client = clients.find(c => c.id === inv.clientId);
        // Simplificamos la obtención de la ciudad
        const city = client?.address ? client.address.split(',').pop().trim() : 'Desconocida';
        
        inv.items.forEach(item => {
            if (!productPerformance[item.productId]) {
                productPerformance[item.productId] = { 
                    name: item.name, 
                    totalQuantity: 0,
                    byLocation: { SPS: 0, TGU: 0 },
                    byCity: {}
                };
            }
            productPerformance[item.productId].totalQuantity += item.quantity;
            if (inv.saleLocation) {
                productPerformance[item.productId].byLocation[inv.saleLocation] += item.quantity;
            }
            productPerformance[item.productId].byCity[city] = (productPerformance[item.productId].byCity[city] || 0) + item.quantity;
        });
    });
    const topProducts = Object.values(productPerformance).sort((a,b) => b.totalQuantity - a.totalQuantity);

    // --- CÁLCULOS DE CLIENTES ---
    const clientPerformance = {};
    clients.forEach(c => clientPerformance[c.id] = { id: c.id, name: c.name, totalAmount: 0, productCount: 0 });
    
    periodInvoices.filter(i => i.status === 'Pagada').forEach(inv => {
        if(clientPerformance[inv.clientId]){
            clientPerformance[inv.clientId].totalAmount += inv.total;
            clientPerformance[inv.clientId].productCount += inv.items.reduce((sum, item) => sum + item.quantity, 0);
        }
    });
    const topClientsByAmount = Object.values(clientPerformance).filter(c => c.totalAmount > 0).sort((a,b) => b.totalAmount - a.totalAmount);
    
    // Clientes con mayor saldo deudor (esto se calcula sobre TODAS las facturas, no solo las del período)
    const topDebtors = {};
    invoices.filter(inv => (inv.balanceDue ?? 0) > 0.01).forEach(inv => {
        if (!topDebtors[inv.clientId]) {
            topDebtors[inv.clientId] = { name: inv.clientName, totalDebt: 0 };
        }
        topDebtors[inv.clientId].totalDebt += inv.balanceDue;
    });
    const topDebtorsList = Object.values(topDebtors).sort((a,b) => b.totalDebt - a.totalDebt);
    
    // Devolvemos todo en una estructura organizada para la página de reportes
    return {
        salesReport: { 
            salesByMonth: Object.fromEntries(Object.entries(salesByMonth).sort()), // Ordenar por mes
            salesByYear, 
            salesByLocation 
        },
        productReport: { topProducts },
        clientReport: { topClientsByAmount, topDebtorsList }
    };
};