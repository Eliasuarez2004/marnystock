import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getInvoicePayments, addPaymentToInvoice, anullInvoice } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { toast } from 'react-toastify';
import { FiEye, FiPlusCircle, FiXCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const statusStyles = {
    'Pagada': 'bg-green-100 text-green-800',
    'Abonada': 'bg-blue-100 text-blue-800',
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Anulada': 'bg-gray-200 text-gray-600 font-medium',
};

// --- MODAL DE DETALLE (CON CORRECCIÓN DEFENSIVA) ---
const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        if (isOpen && invoice) {
            const unsubscribe = getInvoicePayments(invoice.id, setPayments);
            return () => unsubscribe();
        }
    }, [isOpen, invoice]);

    if (!isOpen || !invoice) return null;

    const balanceDue = invoice.balanceDue ?? invoice.total;
    const amountPaid = invoice.amountPaid || 0;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-text-dark">Detalle de Factura <span className="text-primary">{invoice.invoiceNumber}</span></h2>
                        <p className="text-gray-500">Cliente: {invoice.clientName}</p>
                        <p className="text-gray-500">Fecha: {invoice.issueDate} | Sede: {invoice.saleLocation}</p>
                    </div>
                    <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-800">&times;</button>
                </div>
                
                <div className="overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-2">Artículos Facturados</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">Producto</th><th className="p-2 text-center">Cant.</th><th className="p-2 text-right">Precio Unit.</th><th className="p-2 text-right">Subtotal</th></tr></thead>
                            <tbody>
                                {(invoice.items || []).map((item, i) => {
                                    // Verificación defensiva para evitar errores con datos antiguos
                                    const price = typeof item.price === 'number' ? item.price : 0;
                                    const subtotal = (typeof item.subtotal === 'number' ? item.subtotal : (price * (item.quantity || 0)));
                                    return (
                                        <tr key={i} className="border-b">
                                            <td className="p-2">{item.name}</td>
                                            <td className="p-2 text-center">{item.quantity || 0}</td>
                                            <td className="p-2 text-right">L {price.toFixed(2)}</td>
                                            <td className="p-2 text-right font-semibold">L {subtotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-lg mb-2">Historial de Pagos</h3>
                        {payments.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Método</th><th className="p-2 text-left">Referencia</th><th className="p-2 text-right">Monto</th></tr></thead>
                                <tbody>{payments.map(p => <tr key={p.id} className="border-b"><td className="p-2">{p.paymentDate}</td><td className="p-2">{p.paymentMethod}</td><td className="p-2">{p.reference || '-'}</td><td className="p-2 text-right font-semibold">L {(p.amount || 0).toFixed(2)}</td></tr>)}</tbody>
                            </table>
                        ) : <p className="text-center text-gray-500 p-4">No hay abonos registrados.</p>}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t text-right space-y-1">
                    <p>Subtotal: <span className="font-semibold">L {(invoice.subtotal || 0).toFixed(2)}</span></p>
                    <p>ISV (15%): <span className="font-semibold">L {(invoice.tax || 0).toFixed(2)}</span></p>
                    <p className="text-xl">Total Factura: <span className="font-bold">L {(invoice.total || 0).toFixed(2)}</span></p>
                    <p className="text-green-600">Total Pagado: <span className="font-bold">L {amountPaid.toFixed(2)}</span></p>
                    <p className="text-2xl text-red-600">Saldo Pendiente: <span className="font-bold">L {balanceDue.toFixed(2)}</span></p>
                </div>
                <div className="flex justify-end pt-4"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cerrar</button></div>
            </motion.div>
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

    const balanceDue = invoice.balanceDue ?? invoice.total;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        const epsilon = 0.001;
        if (paymentAmount <= 0 || paymentAmount > (balanceDue + epsilon)) {
            toast.error(`El monto debe ser entre L 0.01 y L ${balanceDue.toFixed(2)}`);
            return;
        }
        setLoading(true);
        try {
            await addPaymentToInvoice(invoice, { amount: paymentAmount, paymentMethod, reference });
            toast.success('Abono registrado exitosamente!');
            onClose();
        } catch (error) { toast.error('Error al registrar el abono.'); console.error(error); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Abono a Factura {invoice.invoiceNumber}</h2>
                    <button onClick={onClose} className="text-3xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <p className="mb-1">Total Factura: <span className="font-bold">L {invoice.total.toFixed(2)}</span></p>
                <p className="mb-4">Saldo Pendiente: <span className="font-bold text-red-600">L {balanceDue.toFixed(2)}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto a abonar" required className="w-full p-2 border rounded" step="0.01" min="0.01" />
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                        <option>Efectivo</option><option>Transferencia Bancaria</option>
                        <option>Tarjeta de Crédito/Débito</option><option>Otro</option>
                    </select>
                    <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia o nota (opcional)" className="w-full p-2 border rounded" />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-blue-300">{loading ? 'Guardando...' : 'Guardar Abono'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// --- MODAL PARA ANULAR FACTURA ---
const AnullInvoiceModal = ({ isOpen, onClose, invoice, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(isOpen) { setReason(''); }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!reason) { toast.warn("Debes especificar una razón para anular la factura."); return; }
        setLoading(true);
        await onConfirm(reason);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Anular Factura {invoice.invoiceNumber}</h2>
                <p className="text-gray-600 mb-4">Esta acción devolverá el stock al inventario y marcará la factura como anulada. Esta operación no se puede deshacer.</p>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Razón de Anulación</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Error en la facturación, pedido cancelado por cliente..." required className="w-full p-2 border rounded h-24"></textarea>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300">{loading ? 'Anulando...' : 'Confirmar Anulación'}</button>
                </div>
            </motion.div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE FACTURAS ---
const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isAnullModalOpen, setIsAnullModalOpen] = useState(false);
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
    const openAnullModal = (invoice) => { setSelectedInvoice(invoice); setIsAnullModalOpen(true); };
    const closeModal = () => { setIsPaymentModalOpen(false); setIsDetailModalOpen(false); setIsAnullModalOpen(false); setSelectedInvoice(null); };

    const handleAnullConfirm = async (reason) => {
        if (!selectedInvoice) return;
        try {
            await anullInvoice(selectedInvoice, reason);
            toast.success(`Factura ${selectedInvoice.invoiceNumber} anulada correctamente.`);
            closeModal();
        } catch (error) {
            toast.error(`Error al anular la factura: ${error.message}`);
        }
    };

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
                    <input type="text" placeholder="Buscar por # Factura, Cliente o Estado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md"/>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                        <thead className="text-left bg-gray-100">
                            <tr>
                                <th className="p-3"># Factura</th><th className="p-3">Cliente</th><th className="p-3">Fecha</th>
                                <th className="p-3 text-right">Total</th><th className="p-3 text-right">Pagado</th><th className="p-3 text-right">Saldo</th>
                                <th className="p-3 text-center">Estado</th><th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? ( <tr><td colSpan="8" className="text-center p-6 text-gray-500">Cargando facturas...</td></tr> ) : 
                            filteredInvoices.length > 0 ? (
                                filteredInvoices.map(invoice => {
                                    const balanceDue = invoice.balanceDue ?? invoice.total;
                                    const amountPaid = invoice.amountPaid || 0;
                                    const isFullyPaid = balanceDue <= 0.001;

                                    return (
                                        <tr key={invoice.id} className={`border-b hover:bg-gray-50 ${invoice.status === 'Anulada' ? 'bg-gray-100 text-gray-500' : ''}`}>
                                            <td className="p-3 font-mono">{invoice.invoiceNumber}</td>
                                            <td className="p-3">{invoice.clientName}</td>
                                            <td className="p-3">{invoice.issueDate}</td>
                                            <td className="p-3 font-semibold text-right">L {invoice.total.toFixed(2)}</td>
                                            <td className="p-3 text-green-600 text-right">{isFullyPaid ? `L ${invoice.total.toFixed(2)}` : `L ${amountPaid.toFixed(2)}`}</td>
                                            <td className={`p-3 font-bold text-right ${isFullyPaid ? 'text-gray-500' : 'text-red-600'}`}>{balanceDue.toFixed(2)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[invoice.status] || statusStyles['Pendiente']}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openDetailModal(invoice)} title="Ver Detalles" className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"><FiEye /></button>
                                                    <button onClick={() => openPaymentModal(invoice)} title="Registrar Abono" disabled={isFullyPaid || invoice.status === 'Anulada'} className="text-sm px-3 py-1 rounded flex items-center gap-1 bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                                        <FiPlusCircle />
                                                    </button>
                                                    <button onClick={() => openAnullModal(invoice)} title="Anular Factura" disabled={invoice.status === 'Anulada'} className="text-sm px-3 py-1 rounded flex items-center gap-1 bg-red-500 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                                        <FiXCircle/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr><td colSpan="8" className="text-center p-6 text-gray-500">No se encontraron facturas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {selectedInvoice && (
                <>
                    <AddPaymentModal isOpen={isPaymentModalOpen} onClose={closeModal} invoice={selectedInvoice} />
                    <InvoiceDetailModal isOpen={isDetailModalOpen} onClose={closeModal} invoice={selectedInvoice} />
                    <AnullInvoiceModal isOpen={isAnullModalOpen} onClose={closeModal} invoice={selectedInvoice} onConfirm={handleAnullConfirm} />
                </>
            )}
        </AnimatedPage>
    );
};

export default Invoices;