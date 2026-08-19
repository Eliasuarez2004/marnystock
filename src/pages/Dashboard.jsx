import React, { useState, useEffect } from 'react';
import { getSmartDashboardData } from '../firebase/dashboardService';
import { FiTrendingUp, FiAlertCircle, FiBox, FiUsers, FiPlus, FiDollarSign } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Componentes UI Internos Modernos ---

const StatCard = ({ title, value, icon: Icon, colorClass, subtext, trend }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-lg transition-all duration-300 group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClass} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
            </div>
        </motion.div>
    );
};

// --- Componente Principal ---
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

    // Helpers de formato
    const formatCurrency = (amount) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);

    if (loading && !stats) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando métricas...</div>;
    }

    if (!stats) return null;

    return (
        <AnimatedPage>
            {/* Contenedor Global con Fondo Gris Suave */}
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                
                {/* Encabezado y Filtros */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Panel de Control</h1>
                        <p className="text-slate-500 mt-1 font-medium">Resumen de operaciones en tiempo real</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {/* Selector de Fecha Estilizado */}
                        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                            {[
                                { key: 'thisMonth', label: 'Este Mes' },
                                { key: 'last30days', label: '30 Días' },
                                { key: 'thisYear', label: 'Este Año' },
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setTimeFilter(filter.key)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                                        timeFilter === filter.key 
                                        ? 'bg-slate-800 text-white shadow-md' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => navigate('/facturas/crear')} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <FiPlus size={20} /> Nueva Factura
                        </button>
                    </div>
                </div>

                {/* Grid de KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        title="Ingresos Totales" 
                        value={formatCurrency(stats.totalRevenue)} 
                        icon={FiDollarSign} 
                        colorClass="bg-blue-500"
                        subtext="Facturado en el período"
                        trend={stats.revenueChange ? parseFloat(stats.revenueChange.toFixed(1)) : null}
                    />
                    <StatCard 
                        title="Cuentas por Cobrar" 
                        value={formatCurrency(stats.accountsReceivable)} 
                        icon={FiAlertCircle} 
                        colorClass="bg-amber-500"
                        subtext="Pendiente de recaudo"
                    />
                    <StatCard 
                        title="Valor Inventario" 
                        value={formatCurrency(stats.inventoryValue)} 
                        icon={FiBox} 
                        colorClass="bg-emerald-500"
                        subtext="Costo total en almacén"
                    />
                    <StatCard 
                        title="Clientes Activos" 
                        value={stats.totalClients} 
                        icon={FiUsers} 
                        colorClass="bg-purple-500"
                        subtext="Base de datos total"
                    />
                </div>

                {/* Sección Principal: Gráfico + Listas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Gráfico de Ventas */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FiTrendingUp className="text-blue-500"/> Rendimiento de Ventas
                            </h3>
                        </div>
                        <div className="h-80 w-full relative">
                             <Bar 
                                data={{
                                    labels: stats.salesChartData.labels,
                                    datasets: [{
                                        label: 'Ventas (HNL)',
                                        data: stats.salesChartData.data,
                                        backgroundColor: '#3b82f6',
                                        borderRadius: 6,
                                        hoverBackgroundColor: '#2563eb'
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { grid: { borderDash: [4, 4], color: '#f1f5f9' }, border: { display: false } },
                                        x: { grid: { display: false }, border: { display: false } }
                                    }
                                }} 
                            />
                        </div>
                    </div>

                    {/* Columna Lateral de Alertas */}
                    <div className="space-y-6">
                        
                        {/* Bajo Stock */}
                        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                                <h3 className="font-bold text-slate-700">Stock Crítico</h3>
                                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{stats.lowStockProducts.length}</span>
                            </div>
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                {stats.lowStockProducts.length > 0 ? (
                                    stats.lowStockProducts.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700 line-clamp-1">{p.name}</span>
                                                <span className="text-xs text-slate-400">Min: 10 unds</span>
                                            </div>
                                            <span className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded-md">{p.totalStock}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-4">Todo el inventario saludable.</p>
                                )}
                            </div>
                        </div>

                        {/* Próximos a Vencer */}
                        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                                <h3 className="font-bold text-slate-700">Por Vencer (90d)</h3>
                                <FiAlertCircle className="text-orange-500" />
                            </div>
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                {(stats.expiringSoon.SPS.length > 0 || stats.expiringSoon.TGU.length > 0) ? (
                                    <>
                                        {stats.expiringSoon.SPS.map((item, i) => (
                                            <div key={`sps-${i}`} className="p-2 hover:bg-orange-50/50 rounded-lg transition-colors border-l-2 border-orange-400">
                                                <p className="text-sm font-semibold text-slate-700">{item.productName}</p>
                                                <div className="flex justify-between mt-1 text-xs">
                                                    <span className="text-orange-600 font-medium">Vence: {item.expiryDate}</span>
                                                    <span className="text-slate-400 font-bold">SPS</span>
                                                </div>
                                            </div>
                                        ))}
                                        {stats.expiringSoon.TGU.map((item, i) => (
                                            <div key={`tgu-${i}`} className="p-2 hover:bg-orange-50/50 rounded-lg transition-colors border-l-2 border-blue-400">
                                                <p className="text-sm font-semibold text-slate-700">{item.productName}</p>
                                                <div className="flex justify-between mt-1 text-xs">
                                                    <span className="text-orange-600 font-medium">Vence: {item.expiryDate}</span>
                                                    <span className="text-slate-400 font-bold">TGU</span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-4">No hay vencimientos próximos.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
};

export default Dashboard;