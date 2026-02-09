import React, { useState, useEffect } from 'react';
import { getAdvancedReportData } from '../firebase/reportingService';
import AnimatedPage from '../components/AnimatedPage';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { FiPieChart, FiTrendingUp, FiUsers } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ventas');
    const [timeFilter, setTimeFilter] = useState('thisMonth');

    useEffect(() => {
        setLoading(true);
        getAdvancedReportData(timeFilter).then(d => { setReportData(d); setLoading(false); }).catch(() => setLoading(false));
    }, [timeFilter]);

    if(loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Generando inteligencia de negocios...</div>;

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Reportes</h1>
                        <p className="text-slate-500 font-medium">Análisis de rendimiento</p>
                    </div>
                    
                    <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                        {[{k:'thisMonth',l:'Mes Actual'}, {k:'last30days',l:'30 Días'}, {k:'thisYear',l:'Anual'}].map(f => (
                            <button key={f.k} onClick={() => setTimeFilter(f.k)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${timeFilter === f.k ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>{f.l}</button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-8">
                    {[{id:'ventas', i:FiTrendingUp, l:'Ventas'}, {id:'productos', i:FiPieChart, l:'Productos'}, {id:'clientes', i:FiUsers, l:'Clientes'}].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <tab.i/> {tab.l}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {reportData ? (
                    <div className="space-y-6">
                        {activeTab === 'ventas' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-700 mb-6">Histórico de Ventas</h3>
                                    <Bar data={{ labels: Object.keys(reportData.salesReport.salesByMonth).sort(), datasets: [{ label: 'Ventas (L)', data: Object.values(reportData.salesReport.salesByMonth), backgroundColor: '#3b82f6', borderRadius: 4 }] }} />
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-700 mb-6">Ventas por Sede</h3>
                                    <div className="relative h-64"><Doughnut data={{ labels: ['SPS', 'TGU'], datasets: [{ data: [reportData.salesReport.salesByLocation.SPS, reportData.salesReport.salesByLocation.TGU], backgroundColor: ['#3b82f6', '#60a5fa'] }] }} options={{maintainAspectRatio: false}} /></div>
                                </div>
                            </div>
                        )}
                        {/* (Añadir lógica similar para productos y clientes usando las mismas clases de tarjetas bg-white rounded-2xl) */}
                        {activeTab === 'productos' && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-4">Top Productos</h3>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr><th className="p-3">Producto</th><th className="p-3 text-center">Cant.</th><th className="p-3 text-center">SPS</th><th className="p-3 text-center">TGU</th></tr></thead>
                                    <tbody>{reportData.productReport.topProducts.map((p,i) => <tr key={i} className="border-b last:border-0"><td className="p-3 font-medium">{p.name}</td><td className="p-3 text-center font-bold text-blue-600">{p.totalQuantity}</td><td className="p-3 text-center">{p.byLocation.SPS||0}</td><td className="p-3 text-center">{p.byLocation.TGU||0}</td></tr>)}</tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : <div className="text-center py-20 text-red-400">Error cargando datos</div>}
            </div>
        </AnimatedPage>
    );
};
export default Reports;