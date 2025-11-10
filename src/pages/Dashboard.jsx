// src/pages/Dashboard.jsx (actualizado)
import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../firebase/dashboardService';
import StatCard from '../components/StatCard';
import { FiTrendingUp, FiAlertCircle, FiArchive, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const statusStyles = {
    'Pagada': 'bg-green-100 text-green-800',
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Anulada': 'bg-red-100 text-red-800',
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                setError('No se pudieron cargar los datos del dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="text-center p-10">Cargando dashboard...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary mb-6">Resumen del Negocio</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Ingresos Totales (Pagado)"
                    value={`L ${stats.totalRevenue.toFixed(2)}`}
                    icon={FiTrendingUp}
                    colorClass="bg-green-500"
                />
                <StatCard 
                    title="Cuentas por Cobrar"
                    value={`L ${stats.accountsReceivable.toFixed(2)}`}
                    icon={FiAlertCircle}
                    colorClass="bg-yellow-500"
                />
                <StatCard 
                    title="Valor del Inventario"
                    value={`L ${stats.inventoryValue.toFixed(2)}`}
                    icon={FiArchive}
                    colorClass="bg-blue-500"
                />
                <StatCard 
                    title="Total de Clientes"
                    value={stats.totalClients}
                    icon={FiUsers}
                    colorClass="bg-purple-500"
                />
            </div>

            {/* Low Stock and Recent Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Products */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-secondary mb-4">Productos con Bajo Stock</h2>
                    {stats.lowStockProducts.length > 0 ? (
                        <ul>
                            {stats.lowStockProducts.map(product => (
                                <li key={product.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                    <span>{product.name}</span>
                                    <span className="font-bold text-red-600">Quedan: {product.stock}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No hay productos con bajo stock.</p>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-secondary mb-4">Facturas Recientes</h2>
                    {stats.recentInvoices.length > 0 ? (
                        <table className="w-full text-sm">
                            <tbody>
                                {stats.recentInvoices.map(invoice => (
                                    <tr key={invoice.id} className="border-b last:border-b-0">
                                        <td className="p-2 font-mono">{invoice.invoiceNumber}</td>
                                        <td className="p-2">{invoice.clientName}</td>
                                        <td className="p-2 font-bold">L {invoice.total.toFixed(2)}</td>
                                        <td className="p-2 text-right">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[invoice.status]}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No se han generado facturas.</p>
                    )}
                    <Link to="/facturas" className="text-sm text-blue-600 hover:underline mt-4 block text-right">Ver todas las facturas</Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;