import { db } from './config';
import { collection, getDocs } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, startOfDay } from 'date-fns';

const getAllData = async () => {
    const [inventoryLotsSnapshot, clientsSnapshot, invoicesSnapshot, productTypesSnapshot] = await Promise.all([
        getDocs(collection(db, 'inventory_lots')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'products')),
    ]);

    const lots = inventoryLotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const productTypes = productTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { lots, clients, invoices, productTypes };
};

const calculateStatsForPeriod = (invoices, startDate, endDate) => {
    const periodInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
    });
    
    const totalRevenue = periodInvoices.filter(inv => inv.status === 'Pagada').reduce((acc, inv) => acc + inv.total, 0);
    const accountsReceivable = periodInvoices.filter(inv => inv.status === 'Pendiente' || inv.status === 'Abonada').reduce((acc, inv) => acc + (inv.balanceDue ?? inv.total), 0);
        
    return { totalRevenue, accountsReceivable };
};

export const getSmartDashboardData = async (timeFilter = 'thisMonth') => {
    const { lots, clients, invoices, productTypes } = await getAllData();

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
    
    const currentStats = calculateStatsForPeriod(invoices, currentPeriodStart, currentPeriodEnd);
    const prevStats = calculateStatsForPeriod(invoices, prevPeriodStart, prevPeriodEnd);

    const revenueChange = prevStats.totalRevenue === 0 ? (currentStats.totalRevenue > 0 ? 100 : 0) : ((currentStats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100;
    
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

    const inventoryValue = lots.reduce((acc, lot) => {
        const productInfo = productTypes.find(p => p.id === lot.productId);
        const price = productInfo?.price || 0;
        const totalStockInLot = (lot.stockSPS || 0) + (lot.stockTGU || 0);
        return acc + (price * totalStockInLot);
    }, 0);
    
    const stockByProduct = lots.reduce((acc, lot) => {
        const totalStockInLot = (lot.stockSPS || 0) + (lot.stockTGU || 0);
        if (!acc[lot.productId]) {
            acc[lot.productId] = { id: lot.productId, name: lot.productName, totalStock: 0 };
        }
        acc[lot.productId].totalStock += totalStockInLot;
        return acc;
    }, {});
    const lowStockProducts = Object.values(stockByProduct).filter(p => p.totalStock > 0 && p.totalStock <= 10).sort((a, b) => a.totalStock - b.totalStock);
    
    const expiringSoon = { SPS: [], TGU: [] };
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    lots.forEach(lot => {
        const expiryDate = new Date(lot.expiryDate);
        if (expiryDate >= today && expiryDate <= ninetyDaysFromNow) {
            if (lot.stockSPS > 0) {
                expiringSoon.SPS.push({ productName: lot.productName, lotNumber: lot.lotNumber, expiryDate: lot.expiryDate, quantity: lot.stockSPS, lotId: lot.id });
            }
            if (lot.stockTGU > 0) {
                expiringSoon.TGU.push({ productName: lot.productName, lotNumber: lot.lotNumber, expiryDate: lot.expiryDate, quantity: lot.stockTGU, lotId: lot.id });
            }
        }
    });
    expiringSoon.SPS.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    expiringSoon.TGU.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const totalClients = clients.length;
    const totalAccountsReceivable = invoices.filter(inv => (inv.balanceDue ?? 0) > 0.01).reduce((acc, inv) => acc + inv.balanceDue, 0);

    return {
        totalRevenue: currentStats.totalRevenue,
        revenueChange,
        accountsReceivable: totalAccountsReceivable,
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