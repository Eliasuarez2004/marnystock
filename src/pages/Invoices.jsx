// src/pages/Invoices.jsx (actualizado con búsqueda)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, updateInvoiceStatus } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';

const statusStyles = {
    'Pagada': 'bg-green-100 text-green-800',
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Anulada': 'bg-red-100 text-red-800',
};

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); // Estado para la búsqueda

    useEffect(() => {
        const unsubscribe = getInvoices((fetchedInvoices) => {
            setInvoices(fetchedInvoices);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filtra las facturas por número, cliente o estado
    const filteredInvoices = invoices.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStatusChange = async (id, currentStatus) => {
        if (currentStatus !== 'Pendiente') {
            // Usaremos notificaciones toast en el futuro, por ahora un simple return
            return;
        }
        if (window.confirm("¿Marcar esta factura como Pagada? Esta acción no se puede deshacer.")) {
            try {
                await updateInvoiceStatus(id, 'Pagada');
            } catch (error) {
                console.error("Error al actualizar estado:", error);
            }
        }
    };
    
    return (
        <AnimatedPage>
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-secondary">Facturas</h1>
                    <Link to="/facturas/crear" className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-red-700 transition-colors">
                        + Nueva Factura
                    </Link>
                </div>

                {/* Barra de Búsqueda */}
                <div className="mb-4">
                    <input 
                        type="text"
                        placeholder="Buscar por # Factura, Cliente o Estado..."
                        className="w-full p-2 border rounded-md"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    {loading ? <p>Cargando facturas...</p> : (
                        <table className="w-full min-w-max">
                            <thead className="text-left bg-gray-100">
                                <tr>
                                    <th className="p-3"># Factura</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.length > 0 ? (
                                    filteredInvoices.map(invoice => (
                                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono">{invoice.invoiceNumber}</td>
                                            <td className="p-3">{invoice.clientName}</td>
                                            <td className="p-3">{invoice.issueDate}</td>
                                            <td className="p-3">L {invoice.total.toFixed(2)}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[invoice.status]}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <button 
                                                    onClick={() => handleStatusChange(invoice.id, invoice.status)} 
                                                    disabled={invoice.status !== 'Pendiente'}
                                                    className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                                                >
                                                    Marcar Pagada
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center p-6 text-gray-500">
                                            No se encontraron facturas que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AnimatedPage>
    );
};

export default Invoices;