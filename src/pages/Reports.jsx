// src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import { getComprehensiveReportData } from '../firebase/reportingService';
import AnimatedPage from '../components/AnimatedPage';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ClientMap from '../components/ClientMap';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Reports = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getComprehensiveReportData()
            .then(data => setReportData(data))
            .finally(() => setLoading(false));
    }, []);

    const monthlyChartData = {
        labels: reportData ? Object.keys(reportData.monthlySales).sort() : [],
        datasets: [{
            label: 'Ventas Mensuales (LPS)',
            data: reportData ? Object.values(reportData.monthlySales) : [],
            backgroundColor: 'rgba(204, 0, 51, 0.6)', // Color primario con opacidad
        }],
    };

    if (loading) return <div>Cargando reportes...</div>;
    if (!reportData) return <div>No se pudieron cargar los datos.</div>;

    return (
        <AnimatedPage>
            <h1 className="text-3xl font-bold text-secondary mb-6">Reportes y Análisis</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clientes */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-secondary mb-4">Top 5 Clientes (por Monto)</h2>
                    <ul>{reportData.topClients.map((c, i) => <li key={i} className="border-b p-2"><strong>{c.name}</strong> - L {c.totalAmount.toFixed(2)}</li>)}</ul>
                </div>
                {/* Top Productos */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-secondary mb-4">Top 5 Productos (por Unidades)</h2>
                    <ul>{reportData.topProducts.map((p, i) => <li key={i} className="border-b p-2"><strong>{p.name}</strong> - {p.totalQuantity} unidades</li>)}</ul>
                </div>
                {/* Gráfico de Ventas Mensuales */}
                <div className="bg-white p-4 rounded-lg shadow-md col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-bold text-secondary mb-4">Ventas por Mes</h2>
                    <Bar data={monthlyChartData} />
                </div>
                {/* Mapa de Clientes */}
                <div className="bg-white p-4 rounded-lg shadow-md col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-bold text-secondary mb-4">Ubicación de Clientes</h2>
                    <ClientMap clients={reportData.clientLocations} />
                </div>
            </div>
        </AnimatedPage>
    );
};

export default Reports;