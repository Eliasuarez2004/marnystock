// src/pages/Invoices.jsx (VERSIÓN FINAL CON CORRECCIÓN DE UNDEFINED)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getInvoicePayments, addPaymentToInvoice } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { toast } from 'react-toastify';
import { FiEye, FiPlusCircle } from 'react-icons/fi';

const statusStyles = {
    'Pagada': 'bg-green-100 text-green-800',
    'Abonada': 'bg-blue-100 text-blue-800',
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Anulada': 'bg-red-100 text-red-800',
};

// --- MODAL DE DETALLE ---
const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        if (isOpen && invoice) {
            const unsubscribe = getInvoicePayments(invoice.id, setPayments);
            return () => unsubscribe();
        }
    }, [isOpen, invoice]);

    if (!isOpen || !invoice) return null;

    // --- CORRECCIÓN DEFENSIVA AQUÍ ---
    const balanceDue = invoice.balanceDue ?? invoice.total;
    const amountPaid = invoice.amountPaid || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-text-dark">Detalle de Factura <span className="text-primary">{invoice.invoiceNumber}</span></h2>
                        <p className="text-gray-500">Cliente: {invoice.clientName}</p>
                        <p className="text-gray-500">Fecha: {invoice.issueDate} | Sede: {invoice.saleLocation}</p>
                    </div>
                    <button onClick={onClose} className="text-3xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                
                <div className="overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-2">Artículos Facturados</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100"><tr><th className="p-2 text-left">Producto</th><th className="p-2 text-center">Cant.</th><th className="p-2 text-right">Precio Unit.</th><th className="p-2 text-right">Subtotal</th></tr></thead>
                            <tbody>{invoice.items.map((item, i) => <tr key={i} className="border-b"><td className="p-2">{item.name}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">L {item.price.toFixed(2)}</td><td className="p-2 text-right font-semibold">L {item.subtotal.toFixed(2)}</td></tr>)}</tbody>
                        </table>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-lg mb-2">Historial de Pagos</h3>
                        {payments.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Método</th><th className="p-2 text-left">Referencia</th><th className="p-2 text-right">Monto</th></tr></thead>
                                <tbody>{payments.map(p => <tr key={p.id} className="border-b"><td className="p-2">{p.paymentDate}</td><td className="p-2">{p.paymentMethod}</td><td className="p-2">{p.reference || '-'}</td><td className="p-2 text-right font-semibold">L {p.amount.toFixed(2)}</td></tr>)}</tbody>
                            </table>
                        ) : <p className="text-gray-500 text-center p-4">No hay abonos registrados para esta factura.</p>}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t text-right space-y-1">
                    <p>Subtotal: <span className="font-semibold">L {invoice.subtotal.toFixed(2)}</span></p>
                    <p>ISV (15%): <span className="font-semibold">L {invoice.tax.toFixed(2)}</span></p>
                    <p className="text-xl">Total Factura: <span className="font-bold">L {invoice.total.toFixed(2)}</span></p>
                    <p className="text-green-600">Total Pagado: <span className="font-bold">L {amountPaid.toFixed(2)}</span></p>
                    <p className="text-2xl text-red-600">Saldo Pendiente: <span className="font-bold">L {balanceDue.toFixed(2)}</span></p>
                </div>
            </div>
        </div>
    );
};

// --- MODAL PARA AÑADIR PAGO ---
const AddPaymentModal = ({ isOpen, onClose, invoice }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !invoice) return null;

    // --- CORRECCIÓN DEFENSIVA AQUÍ ---
    // Si balanceDue es undefined o null, usamos el total como valor por defecto.
    const balanceDue = invoice.balanceDue ?? invoice.total;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        if (paymentAmount <= 0 || paymentAmount > balanceDue) {
            toast.error(`El monto debe ser entre L 0.01 y L ${balanceDue.toFixed(2)}`);
            return;
        }
        setLoading(true);
        try {
            // Pasamos la factura completa, incluyendo el balanceDue calculado
            await addPaymentToInvoice({ ...invoice, balanceDue }, { amount: paymentAmount, paymentMethod, reference });
            toast.success('Abono registrado exitosamente!');
            onClose();
        } catch (error) {
            toast.error('Error al registrar el abono.');
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Abono a Factura {invoice.invoiceNumber}</h2>
                    <button onClick={onClose} className="text-3xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <p className="mb-1">Total Factura: <span className="font-bold">L {invoice.total.toFixed(2)}</span></p>
                <p className="mb-4">Saldo Pendiente: <span className="font-bold text-red-600">L {balanceDue.toFixed(2)}</span></p> {/* Usamos la variable segura */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto a abonar" required className="w-full p-2 border rounded" step="0.01" min="0.01" max={balanceDue.toFixed(2)} /> {/* Usamos la variable segura */}
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                        <option>Efectivo</option>
                        <option>Transferencia Bancaria</option>
                        <option>Tarjeta de Crédito/Débito</option>
                        <option>Otro</option>
                    </select>
                    <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia o nota (opcional)" className="w-full p-2 border rounded" />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-blue-300">{loading ? 'Guardando...' : 'Guardar Abono'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        const unsubscribe = getInvoices((fetchedInvoices) => {
            setInvoices(fetchedInvoices);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredInvoices = invoices.filter(invoice =>
        (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.status?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const openPaymentModal = (invoice) => { setSelectedInvoice(invoice); setIsPaymentModalOpen(true); };
    const openDetailModal = (invoice) => { setSelectedInvoice(invoice); setIsDetailModalOpen(true); };
    const closeModal = () => { setIsPaymentModalOpen(false); setIsDetailModalOpen(false); setSelectedInvoice(null); };

    return (
        <AnimatedPage>
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-secondary">Cuentas por Cobrar</h1>
                    <Link to="/facturas/crear" className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <FiPlusCircle /> Nueva Factura
                    </Link>
                </div>

                <div className="mb-4">
                    <input type="text" placeholder="Buscar por # Factura, Cliente o Estado..." className="w-full p-2 border rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                                    <th className="p-3">Pagado</th>
                                    <th className="p-3">Saldo</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.length > 0 ? (
                                    filteredInvoices.map(invoice => {
                                        // --- CORRECCIÓN DEFENSIVA AQUÍ ---
                                        const balanceDue = invoice.balanceDue ?? invoice.total;
                                        const amountPaid = invoice.amountPaid || 0;
                                        return (
                                            <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-mono">{invoice.invoiceNumber}</td>
                                                <td className="p-3">{invoice.clientName}</td>
                                                <td className="p-3">{invoice.issueDate}</td>
                                                <td className="p-3 font-semibold">L {invoice.total.toFixed(2)}</td>
                                                <td className="p-3 text-green-600">L {amountPaid.toFixed(2)}</td>
                                                <td className="p-3 text-red-600 font-bold">L {balanceDue.toFixed(2)}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[invoice.status] || statusStyles['Pendiente']}`}>
                                                        {invoice.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => openDetailModal(invoice)} className="text-sm px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"><FiEye /> Detalles</button>
                                                    <button onClick={() => openPaymentModal(invoice)} disabled={invoice.status === 'Pagada'} className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"><FiPlusCircle /> Abono</button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan="8" className="text-center p-6 text-gray-500">No se encontraron facturas.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            {selectedInvoice && <AddPaymentModal isOpen={isPaymentModalOpen} onClose={closeModal} invoice={selectedInvoice} />}
            {selectedInvoice && <InvoiceDetailModal isOpen={isDetailModalOpen} onClose={closeModal} invoice={selectedInvoice} />}
        </AnimatedPage>
    );
};

export default Invoices;