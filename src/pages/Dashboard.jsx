// src/pages/Dashboard.jsx (VERSIÓN FINAL CON SINTAXIS CORREGIDA)
import React, { useState, useEffect } from 'react';
import { getSmartDashboardData } from '../firebase/dashboardService';
import { FiTrendingUp, FiAlertCircle, FiArchive, FiUsers, FiPlusCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Componentes Internos ---

const StatCard = ({ title, value, icon: Icon, comparison }) => {
    return (
        <div className="bg-light-card p-4 rounded-lg shadow-md flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-text-dark mt-1">{value}</p>
                {comparison && (
                    <div className={`mt-2 text-xs font-bold flex items-center ${comparison.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {comparison.value >= 0 ? '▲' : '▼'} {comparison.value.toFixed(1)}%
                        <span className="text-gray-400 font-normal ml-1">{comparison.label}</span>
                    </div>
                )}
            </div>
            <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Icon size={24} />
            </div>
        </div>
    );
};

const DateFilterButtons = ({ activeFilter, setFilter }) => {
    const filters = [
        { key: 'thisMonth', label: 'Este Mes' },
        { key: 'last30days', label: 'Últimos 30 días' },
        { key: 'thisYear', label: 'Este Año' },
    ];
    return (
        <div className="flex bg-gray-200 rounded-lg p-1">
            {filters.map(filter => (
                <button
                    key={filter.key}
                    onClick={() => setFilter(filter.key)}
                    className={`w-full px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === filter.key ? 'bg-white text-primary shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
};

const SalesChart = ({ chartData }) => {
    const data = {
        labels: chartData.labels,
        datasets: [{
            label: 'Ventas Diarias (LPS)',
            data: chartData.data,
            backgroundColor: '#2563eb',
            borderRadius: 4,
        }],
    };
    const options = { responsive: true, plugins: { legend: { display: false } } };
    return <Bar options={options} data={data} />;
};


// --- Componente Principal del Dashboard ---
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('thisMonth');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getSmartDashboardData(timeFilter);
                setStats(data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeFilter]);

    if (loading && !stats) {
        return <div className="p-6 text-center text-gray-500">Cargando dashboard...</div>;
    }
    if (!stats) {
        return <div className="p-6 text-center text-red-500">No se pudieron cargar los datos del dashboard.</div>;
    }

    return (
        <AnimatedPage>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
                <div className="w-full md:w-auto">
                    <DateFilterButtons activeFilter={timeFilter} setFilter={setTimeFilter} />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/facturas/crear')} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <FiPlusCircle /> Nueva Factura
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <StatCard title="Ingresos" value={`L ${stats.totalRevenue.toFixed(2)}`} icon={FiTrendingUp}
                    comparison={{ value: stats.revenueChange, label: 'vs. período anterior' }} />
                <StatCard title="Cuentas por Cobrar (Total)" value={`L ${stats.accountsReceivable.toFixed(2)}`} icon={FiAlertCircle} />
                <StatCard title="Valor del Inventario" value={`L ${stats.inventoryValue.toFixed(2)}`} icon={FiArchive} />
                <StatCard title="Total de Clientes" value={stats.totalClients} icon={FiUsers} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-secondary mb-4">Rendimiento de Ventas</h2>
                    {loading ? <p className="text-center text-gray-400 py-10">Actualizando gráfico...</p> : <SalesChart chartData={stats.salesChartData} />}
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-secondary mb-2">Bajo Stock (10)</h2>
                        <ul className="text-sm space-y-2 max-h-40 overflow-y-auto pr-2">
                            {/* --- LA CORRECCIÓN DE SINTAXIS ESTÁ AQUÍ --- */}
                            {stats.lowStockProducts.length > 0 ? (
                                stats.lowStockProducts.map(p => (
                                    <li key={p.id} className="cursor-pointer hover:bg-gray-100 p-1 rounded flex justify-between">
                                        <strong>{p.name}</strong>
                                        <span className="font-bold text-red-600">Quedan: {p.totalStock}</span>
                                    </li>
                                ))
                            ) : (
                                <p className="text-gray-500">No hay productos con bajo stock.</p>
                            )}
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-secondary mb-2">Próximos a Vencer (90d)</h2>
                        <ul className="text-sm space-y-2 max-h-40 overflow-y-auto pr-2">
                            {(stats.expiringSoon.SPS.length > 0 || stats.expiringSoon.TGU.length > 0) ? (
                                <>
                                    {stats.expiringSoon.SPS.map((item,i) => <li key={`sps-${i}`} className="cursor-pointer hover:bg-gray-100 p-1 rounded"><strong>{item.productName}</strong> - Vence {item.expiryDate} (SPS)</li>)}
                                    {stats.expiringSoon.TGU.map((item,i) => <li key={`tgu-${i}`} className="cursor-pointer hover:bg-gray-100 p-1 rounded"><strong>{item.productName}</strong> - Vence {item.expiryDate} (TGU)</li>)}
                                </>
                            ) : (
                                <p className="text-gray-500">No hay productos próximos a vencer.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
};

export default Dashboard;