import React, { useState, useEffect } from 'react';
import { getAdvancedReportData } from '../firebase/reportingService';
import AnimatedPage from '../components/AnimatedPage';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    ArcElement, Title, Tooltip, Legend, PointElement, LineElement, Filler
} from 'chart.js';
import { FiPieChart, FiTrendingUp, FiUsers, FiPackage, FiDollarSign, FiStar, FiAlertCircle, FiTag } from 'react-icons/fi';
import { motion } from 'framer-motion';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, ArcElement, 
    PointElement, LineElement, Title, Tooltip, Legend, Filler
);

// --- COMPONENTE: TARJETA DE KPI ---
const KpiCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
        </div>
    </div>
);

const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ventas');
    const [timeFilter, setTimeFilter] = useState('thisMonth');

    useEffect(() => {
        setLoading(true);
        getAdvancedReportData(timeFilter)
            .then(d => { setReportData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [timeFilter]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Procesando Inteligencia de Negocios...</p>
        </div>
    );

    const formatCurrency = (val) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(val);

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">REPORTES EXECUTIVOS</h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Análisis profundo de operaciones Marny's</p>
                    </div>
                    
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                        {[
                            { k: 'thisMonth', l: 'Mes Actual' },
                            { k: 'last30days', l: '30 Días' },
                            { k: 'thisYear', l: 'Anual' }
                        ].map(f => (
                            <button 
                                key={f.k} 
                                onClick={() => setTimeFilter(f.k)} 
                                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${timeFilter === f.k ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABS NAVEGACIÓN */}
                <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit mb-10">
                    {[
                        { id: 'ventas', i: FiTrendingUp, l: 'Rendimiento de Ventas' },
                        { id: 'productos', i: FiPackage, l: 'Análisis de Productos' },
                        { id: 'clientes', i: FiUsers, l: 'Cartera de Clientes' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <tab.i size={18}/> {tab.l}
                        </button>
                    ))}
                </div>

                {reportData ? (
                    <div className="space-y-10">
                        
                        {/* --- TAB: VENTAS --- */}
                        {activeTab === 'ventas' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <KpiCard title="Ingresos Brutos" value={formatCurrency(reportData.salesReport.totalGross)} icon={FiDollarSign} color="bg-blue-600" />
                                    <KpiCard title="Total Descuentos" value={formatCurrency(reportData.salesReport.totalDiscount)} icon={FiTag} color="bg-rose-500" />
                                    <KpiCard title="Ticket Promedio" value={formatCurrency(reportData.salesReport.avgTicket)} icon={FiStar} color="bg-emerald-500" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <h3 className="font-black text-slate-800 mb-8 uppercase text-xs tracking-widest flex items-center gap-2"><FiTrendingUp className="text-blue-500"/> Histórico Comercial (LPS)</h3>
                                        <div className="h-80">
                                            <Line 
                                                data={{
                                                    labels: Object.keys(reportData.salesReport.salesByMonth).sort(),
                                                    datasets: [{
                                                        label: 'Ventas Netas',
                                                        data: Object.values(reportData.salesReport.salesByMonth),
                                                        borderColor: '#3b82f6',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                        fill: true,
                                                        tension: 0.4,
                                                        borderWidth: 4,
                                                        pointRadius: 6,
                                                        pointBackgroundColor: '#fff',
                                                        pointBorderWidth: 3
                                                    }]
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <h3 className="font-black text-slate-800 mb-8 uppercase text-xs tracking-widest">Distribución por Sede</h3>
                                        <div className="h-64 relative">
                                            <Doughnut 
                                                data={{
                                                    labels: ['San Pedro Sula', 'Tegucigalpa'],
                                                    datasets: [{
                                                        data: [reportData.salesReport.salesByLocation.SPS, reportData.salesReport.salesByLocation.TGU],
                                                        backgroundColor: ['#1e40af', '#60a5fa'],
                                                        borderWidth: 0,
                                                        hoverOffset: 20
                                                    }]
                                                }}
                                                options={{ cutout: '75%', maintainAspectRatio: false }}
                                            />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Sedes</span>
                                                <span className="text-2xl font-black text-slate-800">100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- TAB: PRODUCTOS --- */}
                        {activeTab === 'productos' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <KpiCard title="Producto más Vendido" value={reportData.productReport.topProducts[0]?.name || 'N/A'} icon={FiStar} color="bg-amber-500" />
                                    <KpiCard title="Total Unidades Despachadas" value={reportData.productReport.totalUnits} icon={FiPackage} color="bg-indigo-600" />
                                </div>
                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ranking de Movimiento de Inventario</h3>
                                        <span className="text-[10px] font-bold text-slate-400">Ordenado por Unidades Totales</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                                <tr><th className="px-8 py-5">Producto</th><th className="px-8 py-5 text-center">Unidades</th><th className="px-8 py-5">Desglose por Sede</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {reportData.productReport.topProducts.map((p, i) => (
                                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{i + 1}</span>
                                                                <span className="font-bold text-slate-700">{p.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full font-black text-xs">{p.totalQuantity}</span>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-6 w-full max-w-xs">
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                                                                        <span className="text-blue-800">SPS: {p.byLocation.SPS || 0}</span>
                                                                        <span className="text-blue-400">TGU: {p.byLocation.TGU || 0}</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                                                                        <div className="h-full bg-blue-800" style={{ width: `${(p.byLocation.SPS / p.totalQuantity) * 100}%` }}></div>
                                                                        <div className="h-full bg-blue-400" style={{ width: `${(p.byLocation.TGU / p.totalQuantity) * 100}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- TAB: CLIENTES --- */}
                        {activeTab === 'clientes' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Top Compradores */}
                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 bg-emerald-50/30">
                                        <h3 className="font-black text-emerald-800 uppercase text-xs tracking-widest flex items-center gap-2"><FiStar/> Clientes VIP (Mayor Facturación)</h3>
                                    </div>
                                    <div className="p-2">
                                        {reportData.clientReport.topClientsByAmount.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">#{(i+1)}</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{c.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cliente Frecuente</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-emerald-600 font-mono">{formatCurrency(c.totalAmount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Deudores */}
                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 bg-rose-50/30">
                                        <h3 className="font-black text-rose-800 uppercase text-xs tracking-widest flex items-center gap-2"><FiAlertCircle/> Cartera Vencida (Mayores Saldos)</h3>
                                    </div>
                                    <div className="p-2">
                                        {reportData.clientReport.topDebtorsList.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black italic">!</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{d.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saldo Pendiente</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-rose-600 font-mono">{formatCurrency(d.totalDebt)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                        <FiPieChart size={64} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-slate-400 font-black uppercase tracking-widest italic">No hay datos suficientes para generar el análisis</h3>
                    </div>
                )}
            </div>
        </AnimatedPage>
    );
};

export default Reports;