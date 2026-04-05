import { db } from './config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export const getAdvancedReportData = async (filter) => {
    let startDate, endDate;
    const now = new Date();

    // 1. LÓGICA DE RANGOS
    if (filter === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (filter === 'thisYear') {
        startDate = `${now.getFullYear()}-01-01`;
        endDate = `${now.getFullYear()}-12-31`;
    } else if (filter === 'last30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    } else if (typeof filter === 'object' && filter.type === 'custom') {
        if (filter.month === 'all') {
            startDate = `${filter.year}-01-01`;
            endDate = `${filter.year}-12-31`;
        } else {
            startDate = `${filter.year}-${filter.month}-01`;
            const lastDay = new Date(filter.year, parseInt(filter.month), 0).getDate();
            endDate = `${filter.year}-${filter.month}-${lastDay}`;
        }
    }

    try {
        // --- PASO CLAVE: OBTENER MAPA DE CLIENTES PARA CORREGIR UBICACIONES ---
        const clientsSnap = await getDocs(collection(db, "clients"));
        const clientDeptMap = {};
        clientsSnap.forEach(doc => {
            clientDeptMap[doc.id] = doc.data().departamento;
        });

        const invoicesRef = collection(db, "invoices");
        const q = query(
            invoicesRef, 
            where("issueDate", ">=", startDate), 
            where("issueDate", "<=", endDate), 
            orderBy("issueDate", "asc")
        );

        const querySnapshot = await getDocs(q);
        const invoices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const salesReport = { totalGross: 0, totalDiscount: 0, salesByMonth: {}, salesByLocation: { SPS: 0, TGU: 0 }, avgTicket: 0 };
        const productMap = {};
        const clientMap = {};
        const departmentMap = {};

        invoices.forEach(inv => {
            if (inv.status === 'Anulada') return;

            // Datos base
            salesReport.totalGross += (inv.subtotalBruto || 0);
            salesReport.totalDiscount += (inv.globalDiscount || 0);
            salesReport.salesByLocation[inv.saleLocation] += (inv.total || 0);
            salesReport.salesByMonth[inv.issueDate] = (salesReport.salesByMonth[inv.issueDate] || 0) + inv.total;

            // --- LÓGICA DE DEPARTAMENTO CORREGIDA ---
            // Prioridad 1: Departamento en la factura.
            // Prioridad 2: Departamento actual del cliente.
            // Prioridad 3: Francisco Morazán (Tegucigalpa) como fallback si no hay nada.
            const dept = inv.clientDepartment || clientDeptMap[inv.clientId] || 'Francisco Morazán';
            
            if (!departmentMap[dept]) {
                departmentMap[dept] = { name: dept, sales: 0, customerCount: new Set(), invoiceCount: 0 };
            }
            departmentMap[dept].sales += inv.total;
            departmentMap[dept].invoiceCount += 1;
            departmentMap[dept].customerCount.add(inv.clientId);

            // Productos
            inv.items.forEach(item => {
                if (!productMap[item.productId]) {
                    productMap[item.productId] = { name: item.name, totalQty: 0, totalRevenue: 0, byDept: {} };
                }
                productMap[item.productId].totalQty += item.quantity;
                productMap[item.productId].totalRevenue += (item.price * item.quantity);
                productMap[item.productId].byDept[dept] = (productMap[item.productId].byDept[dept] || 0) + item.quantity;
            });

            // Clientes
            if (!clientMap[inv.clientId]) {
                clientMap[inv.clientId] = { name: inv.clientName, dept: dept, totalSpend: 0, debt: 0 };
            }
            clientMap[inv.clientId].totalSpend += inv.total;
            clientMap[inv.clientId].debt += (inv.balanceDue || 0);
        });

        const departmentStats = Object.values(departmentMap).map(d => ({
            name: d.name,
            sales: d.sales,
            invoiceCount: d.invoiceCount,
            customerCount: d.customerCount.size
        })).sort((a, b) => b.sales - a.sales);

        salesReport.avgTicket = invoices.length > 0 ? (salesReport.totalGross / invoices.length) : 0;

        return {
            salesReport,
            productReport: {
                topProducts: Object.values(productMap).sort((a, b) => b.totalQty - a.totalQty).slice(0, 15),
                totalUnits: Object.values(productMap).reduce((acc, p) => acc + p.totalQty, 0)
            },
            clientReport: {
                topBuyers: Object.values(clientMap).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10),
                topDebtors: Object.values(clientMap).filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 10)
            },
            departmentStats
        };
    } catch (error) { 
        console.error("Error BI:", error); 
        throw error; 
    }
};