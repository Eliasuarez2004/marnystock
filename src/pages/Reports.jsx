import React, { useState, useEffect } from 'react';
import { getAdvancedReportData } from '../firebase/reportingService';
import AnimatedPage from '../components/AnimatedPage';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// --- COMPONENTES INTERNOS ---

const DateFilterButtons = ({ activeFilter, setFilter }) => {
    const filters = [{ key: 'thisMonth', label: 'Este Mes' }, { key: 'last30days', label: 'Últimos 30 días' }, { key: 'thisYear', label: 'Este Año' }];
    return (
        <div className="flex bg-gray-200 rounded-lg p-1">
            {filters.map(f => (
                <button 
                    key={f.key} 
                    onClick={() => setFilter(f.key)} 
                    className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === f.key ? 'bg-white text-primary shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
};

const SalesReportTab = ({ data }) => {
    const monthlyChartData = {
        labels: Object.keys(data.salesByMonth).sort(),
        datasets: [{ 
            label: 'Ventas (LPS)', 
            data: Object.values(data.salesByMonth), 
            backgroundColor: 'rgba(37, 99, 235, 0.6)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 1,
            borderRadius: 4,
        }]
    };
    const locationChartData = {
        labels: ['San Pedro Sula', 'Tegucigalpa'],
        datasets: [{ 
            data: [data.salesByLocation.SPS, data.salesByLocation.TGU], 
            backgroundColor: ['#2563eb', '#60a5fa'],
            borderColor: '#ffffff',
            borderWidth: 2,
        }]
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md"><h3 className="font-bold text-lg text-secondary mb-4">Ventas por Mes</h3><Bar data={monthlyChartData} /></div>
            <div className="bg-white p-4 rounded-lg shadow-md"><h3 className="font-bold text-lg text-secondary mb-4">Distribución por Sede</h3><Doughnut data={locationChartData} /></div>
        </div>
    );
};

const ProductReportTab = ({ data }) => (
    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
        <h3 className="font-bold text-lg text-secondary mb-4">Ranking de Productos (por Unidades Vendidas)</h3>
        <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Producto</th>
                <th className="p-2 text-center">Unidades (Total)</th>
                <th className="p-2 text-center">Unidades (SPS)</th>
                <th className="p-2 text-center">Unidades (TGU)</th>
            </tr></thead>
            <tbody>
                {data.topProducts.map((p, i) => (
                    <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="p-2 font-bold">{i + 1}</td>
                        <td className="p-2 font-semibold">{p.name}</td>
                        <td className="p-2 text-center font-bold text-primary">{p.totalQuantity}</td>
                        <td className="p-2 text-center">{p.byLocation.SPS || 0}</td>
                        <td className="p-2 text-center">{p.byLocation.TGU || 0}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ClientReportTab = ({ data }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg text-secondary mb-4">Top Clientes (por Monto de Compra)</h3>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-right">Monto Total</th></tr></thead>
                    <tbody>{data.topClientsByAmount.map((c, i) => <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50"><td className="p-2 font-bold">{i+1}</td><td className="p-2 font-semibold">{c.name}</td><td className="p-2 text-right font-bold text-green-600">L {c.totalAmount.toFixed(2)}</td></tr>)}</tbody>
                </table>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg text-secondary mb-4">Clientes con Mayor Saldo Deudor (Histórico)</h3>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-right">Deuda Total</th></tr></thead>
                    <tbody>{data.topDebtorsList.map((d, i) => <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50"><td className="p-2 font-bold">{i+1}</td><td className="p-2 font-semibold">{d.name}</td><td className="p-2 text-right font-bold text-red-600">L {d.totalDebt.toFixed(2)}</td></tr>)}</tbody>
                </table>
            </div>
        </div>
    </div>
);


// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE REPORTES ---
const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ventas');
    const [timeFilter, setTimeFilter] = useState('thisMonth');

    useEffect(() => {
        setLoading(true);
        getAdvancedReportData(timeFilter)
            .then(data => {
                setReportData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error generating reports:", err);
                setLoading(false);
            });
    }, [timeFilter]);

    return (
        <AnimatedPage>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-secondary">Reportes y Análisis</h1>
                <div className="w-full sm:w-auto">
                    <DateFilterButtons activeFilter={timeFilter} setFilter={setTimeFilter} />
                </div>
            </div>
            <div className="mb-6 flex border-b">
                <button onClick={() => setActiveTab('ventas')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'ventas' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-primary'}`}>Ventas</button>
                <button onClick={() => setActiveTab('productos')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'productos' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-primary'}`}>Productos</button>
                <button onClick={() => setActiveTab('clientes')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'clientes' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-primary'}`}>Clientes</button>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500">Generando reportes, por favor espera...</div>
            ) : reportData ? (
                <div>
                    {activeTab === 'ventas' && <SalesReportTab data={reportData.salesReport} />}
                    {activeTab === 'productos' && <ProductReportTab data={reportData.productReport} />}
                    {activeTab === 'clientes' && <ClientReportTab data={reportData.clientReport} />}
                </div>
            ) : (
                <div className="text-center p-10 text-red-500">No se pudieron generar los reportes.</div>
            )}
        </AnimatedPage>
    );
};

export default Reports;