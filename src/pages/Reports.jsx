import React, { useState, useEffect, useMemo } from 'react';
import { getAdvancedReportData } from '../firebase/reportingService';
import AnimatedPage from '../components/AnimatedPage';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    ArcElement, Title, Tooltip, Legend, PointElement, LineElement, Filler
} from 'chart.js';
import { 
    FiPieChart, FiTrendingUp, FiUsers, FiPackage, FiDollarSign, 
    FiStar, FiAlertCircle, FiTag, FiCalendar, FiFilter, FiMapPin, FiX, FiActivity 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const KpiCard = ({ title, value, icon: Icon, color, isCurrency = true }) => {
    const safeValue = isNaN(value) || value === null || value === undefined ? 0 : value;
    const formatCurrency = (val) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(val);
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 flex-1 min-w-[280px]">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}><Icon size={24} /></div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">{isCurrency ? formatCurrency(safeValue) : safeValue.toLocaleString()}</p>
            </div>
        </motion.div>
    );
};

const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ventas');
    const [quickFilter, setQuickFilter] = useState('thisMonth');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedDeptName, setSelectedDeptName] = useState(null);

    const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        { v: 'all', l: 'Todo el Año' }, { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
        { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' }, { v: '07', l: 'Julio' },
        { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' }, { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
    ];

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            const filter = quickFilter === 'custom' ? { type: 'custom', year: selectedYear, month: selectedMonth } : quickFilter;
            try {
                const d = await getAdvancedReportData(filter);
                setReportData(d);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchReports();
    }, [quickFilter, selectedYear, selectedMonth]);

    const displayData = useMemo(() => {
        if (!reportData) return null;
        if (!selectedDeptName) return reportData;

        const deptStats = reportData.departmentStats.find(d => d.name === selectedDeptName);
        const filteredBuyers = reportData.clientReport.topBuyers.filter(c => c.dept === selectedDeptName);
        const filteredDebtors = reportData.clientReport.topDebtors.filter(c => c.dept === selectedDeptName);
        const filteredProducts = reportData.productReport.topProducts
            .filter(p => p.byDept && p.byDept[selectedDeptName] > 0)
            .map(p => ({ ...p, totalQty: p.byDept[selectedDeptName] }));

        return {
            ...reportData,
            salesReport: { ...reportData.salesReport, totalGross: deptStats ? deptStats.sales : 0 },
            productReport: { ...reportData.productReport, topProducts: filteredProducts, totalUnits: filteredProducts.reduce((acc, p) => acc + p.totalQty, 0) },
            clientReport: { topBuyers: filteredBuyers, topDebtors: filteredDebtors }
        };
    }, [reportData, selectedDeptName]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando BI Regional...</p>
        </div>
    );

    const hasData = reportData && (reportData.salesReport.totalGross > 0 || reportData.productReport.totalUnits > 0);

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8 pb-32">
                
                {/* HEADER */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
                    <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Intelligence Hub</h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-3 flex items-center gap-2">
                           <FiActivity className="text-blue-500"/> Marny's Business Intelligence
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex bg-slate-100 p-1 rounded-2xl text-[10px] font-black uppercase">
                            {[{k:'thisMonth',l:'Este Mes'}, {k:'thisYear',l:'Anual'}, {k:'custom',l:'Histórico'}].map(f => (
                                <button key={f.k} onClick={() => {setQuickFilter(f.k); setSelectedDeptName(null);}} className={`px-5 py-2.5 rounded-xl transition-all ${quickFilter === f.k ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{f.l}</button>
                            ))}
                        </div>
                        {quickFilter === 'custom' && (
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
                                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 rounded-xl text-xs font-black p-2 outline-none focus:ring-2 focus:ring-blue-500">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 rounded-xl text-xs font-black p-2 outline-none">{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS Y INDICADOR DE FILTRO */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
                        {[{id:'ventas',l:'Ventas y Mapas',i:FiTrendingUp},{id:'productos',l:'Inventario',i:FiPackage},{id:'clientes',l:'Clientes',i:FiUsers}].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}><tab.i size={18}/> {tab.l}</button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {selectedDeptName && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-2 border-white/20">
                                <FiMapPin className="animate-bounce" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Filtro: {selectedDeptName}</span>
                                <button onClick={() => setSelectedDeptName(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><FiX size={16} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {hasData ? (
                    <div className="space-y-10">
                        {activeTab === 'ventas' && (
                            <>
                                <div className="flex flex-wrap gap-6">
                                    <KpiCard title={selectedDeptName ? `Ventas en ${selectedDeptName}` : "Ventas Globales"} value={displayData.salesReport.totalGross} icon={FiDollarSign} color="bg-blue-600" />
                                    <KpiCard title="Ticket Promedio" value={displayData.salesReport.avgTicket} icon={FiActivity} color="bg-emerald-500" />
                                    <KpiCard title="Departamentos" value={reportData.departmentStats.length} icon={FiMapPin} color="bg-slate-800" isCurrency={false} />
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-5 bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl min-h-[450px]">
                                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><FiMapPin size={180} /></div>
                                        <h3 className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] mb-6 flex items-center gap-2 italic">Distribución Regional</h3>
                                        <div className="grid grid-cols-2 gap-3 relative z-10 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                                            {reportData.departmentStats.map((dept) => (
                                                <motion.button key={dept.name} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setSelectedDeptName(selectedDeptName === dept.name ? null : dept.name)}
                                                    className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedDeptName === dept.name ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'}`}>
                                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">{dept.name}</p>
                                                    <p className="text-sm font-bold text-white">L {dept.sales.toLocaleString()}</p>
                                                    <p className="text-[8px] text-blue-400 font-black uppercase mt-1">{dept.customerCount} Clientes</p>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-center">
                                        <h3 className="font-black text-slate-800 mb-8 uppercase text-[10px] tracking-widest italic">Tendencia de Ingresos</h3>
                                        <div className="h-80"><Line data={{ labels: Object.keys(displayData.salesReport.salesByMonth).sort(), datasets: [{ label: 'Ventas', data: Object.values(displayData.salesReport.salesByMonth), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.05)', fill: true, tension: 0.4, borderWidth: 4, pointRadius: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                                    </div>
                                </div>

                                {/* PANEL AZUL INFORMATIVO (AQUÍ REAPARECE) */}
                                <AnimatePresence>
                                    {selectedDeptName && (
                                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                                            className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-200 flex flex-col md:flex-row justify-between items-center gap-10 border-4 border-white mt-10"
                                        >
                                            <div className="text-center md:text-left flex-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70 mb-2 font-mono">Analytics Region</h4>
                                                <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{selectedDeptName}</h3>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-10 lg:gap-16">
                                                <div className="text-center"><p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Total Ventas</p>
                                                    <p className="text-3xl font-black font-mono">L { (reportData.departmentStats.find(d => d.name === selectedDeptName)?.sales || 0).toLocaleString() }</p>
                                                </div>
                                                <div className="text-center border-x border-white/20 px-10"><p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Clientes</p>
                                                    <p className="text-3xl font-black font-mono">{ (reportData.departmentStats.find(d => d.name === selectedDeptName)?.customerCount || 0) }</p>
                                                </div>
                                                <div className="text-center"><p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Market Share</p>
                                                    <p className="text-3xl font-black font-mono">{ (((reportData.departmentStats.find(d => d.name === selectedDeptName)?.sales || 0) / reportData.salesReport.totalGross) * 100).toFixed(1) }%</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}

                        {activeTab === 'productos' && (
                            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest italic">Productos más vendidos {selectedDeptName ? `en ${selectedDeptName}` : 'Global'}</h3></div>
                                <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                                    <thead className="bg-white text-slate-400 font-black uppercase text-[9px] border-b"><tr><th className="px-8 py-6">Descripción</th><th className="px-8 py-6 text-center">Cant.</th><th className="px-8 py-6 text-right pr-12 italic">Impacto Ventas</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">{displayData.productReport.topProducts.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-6 font-black text-slate-700">{p.name}</td><td className="px-8 py-6 text-center font-bold text-blue-600">{p.totalQty}</td><td className="px-8 py-6 pr-12"><div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(p.totalQty / displayData.productReport.totalUnits) * 100}%` }}></div></div></td></tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        )}

                        {activeTab === 'clientes' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8"><div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50"><FiStar className="text-emerald-500"/><h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Top Compradores</h3></div>
                                <div className="space-y-4">{displayData.clientReport.topBuyers.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem]"><div className="flex flex-col"><span className="font-black text-slate-700 text-sm">{c.name}</span><span className="text-[9px] text-slate-400 font-bold uppercase">{c.dept}</span></div>
                                    <span className="font-black text-emerald-600 font-mono text-lg">L {c.totalSpend.toLocaleString()}</span></div>
                                ))}</div></div>
                                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8"><div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50"><FiAlertCircle className="text-rose-500"/><h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Mayores Deudas</h3></div>
                                <div className="space-y-4">{displayData.clientReport.topDebtors.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem]"><div className="flex flex-col"><span className="font-black text-slate-700 text-sm">{d.name}</span><span className="text-[9px] text-slate-400 font-bold uppercase">{d.dept}</span></div>
                                    <span className="font-black text-rose-600 font-mono text-lg">L {d.debt.toLocaleString()}</span></div>
                                ))}</div></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                        <FiPieChart size={80} className="text-slate-100 mb-6" />
                        <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] italic text-center">Analytics Marny's<br/><span className="text-xs font-bold text-slate-300 uppercase">Sin registros en este periodo</span></h3>
                    </div>
                )}
            </div>
        </AnimatedPage>
    );
};

export default Reports;