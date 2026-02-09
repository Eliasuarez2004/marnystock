import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getInvoicePayments, addPaymentToInvoice, anullInvoice } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { toast } from 'react-toastify';
import { FiEye, FiPlus, FiXOctagon, FiSearch, FiFileText, FiX, FiCheck, FiDollarSign } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// --- ESTILOS DE ESTADO MEJORADOS ---
const statusStyles = {
    'Pagada': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Abonada': 'bg-blue-100 text-blue-700 border border-blue-200',
    'Pendiente': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Anulada': 'bg-slate-100 text-slate-500 border border-slate-200 line-through decoration-slate-400',
};

// --- COMPONENTE FILA DE DETALLE ---
const DetailItemRow = ({ item }) => {
    const saleItem = item.lines.find(line => !line.isBonus);
    const bonusItem = item.lines.find(line => line.isBonus);

    const displayQuantity = () => {
        if (saleItem && bonusItem) return `${saleItem.quantity} + ${bonusItem.quantity}`;
        if (saleItem) return saleItem.quantity;
        if (bonusItem) return bonusItem.quantity;
        return 0;
    };
    
    const unitPrice = saleItem?.price || bonusItem?.price || 0;
    const total = saleItem ? saleItem.price * saleItem.quantity : 0;

    return (
        <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <td className="p-3 text-slate-700">
                <div className="font-medium">{item.name}</div>
                {bonusItem && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-600 border border-emerald-200 mt-1">BONIFICADO</span>}
            </td>
            <td className="p-3 text-center text-slate-600">{displayQuantity()}</td>
            <td className="p-3 text-right text-slate-600 font-mono text-xs">{`L ${unitPrice.toFixed(2)}`}</td>
            <td className="p-3 text-right font-semibold text-slate-800 font-mono">{`L ${total.toFixed(2)}`}</td>
        </tr>
    );
};

// --- MODAL DE DETALLE (DISEÑO CLEAN) ---
const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        if (isOpen && invoice) {
            const unsubscribe = getInvoicePayments(invoice.id, setPayments);
            return () => unsubscribe();
        }
    }, [isOpen, invoice]);

    const groupedItems = useMemo(() => {
        if (!invoice?.items) return [];
        const grouped = {};
        invoice.items.forEach(item => {
            if (!grouped[item.productId]) {
                grouped[item.productId] = { productId: item.productId, name: item.name, lines: [] };
            }
            grouped[item.productId].lines.push(item);
        });
        return Object.values(grouped);
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    const balanceDue = invoice.balanceDue ?? invoice.total;
    const amountPaid = invoice.amountPaid || 0;
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header Modal */}
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Factura <span className="text-blue-600 font-mono">#{invoice.invoiceNumber}</span></h2>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-slate-500 mt-1">
                            <span><strong className="text-slate-700">Cliente:</strong> {invoice.clientName}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{invoice.issueDate}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{invoice.saleLocation}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><FiX size={20}/></button>
                </div>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
                    
                    {/* Tabla Productos */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle de Compra</h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 text-left">Producto</th>
                                        <th className="p-3 text-center">Cant.</th>
                                        <th className="p-3 text-right">Unitario</th>
                                        <th className="p-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedItems.map(item => <DetailItemRow key={item.productId} item={item} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Historial Pagos */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Historial de Pagos</h3>
                        {payments.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Método</th><th className="p-3 text-left">Ref</th><th className="p-3 text-right">Monto</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map(p => (
                                            <tr key={p.id}>
                                                <td className="p-3 text-slate-600">{p.paymentDate}</td>
                                                <td className="p-3 text-slate-600">{p.paymentMethod}</td>
                                                <td className="p-3 text-slate-400 text-xs">{p.reference || '-'}</td>
                                                <td className="p-3 text-right font-bold text-emerald-600 font-mono">L {(p.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400 text-sm border border-dashed border-slate-200">
                                No se han registrado abonos aún.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Totales */}
                <div className="bg-slate-50 p-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-slate-500"><span>Subtotal:</span> <span>L {(invoice.subtotal || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-500"><span>ISV (15%):</span> <span>L {(invoice.tax || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-rose-500 font-medium pt-1"><span>Descuentos:</span> <span>- L {(invoice.discountAmount || 0).toFixed(2)}</span></div>
                        </div>
                        <div className="space-y-2 text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase">Total Factura</div>
                            <div className="text-2xl font-black text-slate-800">L {(invoice.total || 0).toFixed(2)}</div>
                            <div className="flex justify-end gap-3 text-sm pt-2">
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md font-bold">Pagado: L {amountPaid.toFixed(2)}</span>
                                <span className={`px-2 py-1 rounded-md font-bold ${balanceDue > 0.01 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                                    Pendiente: L {balanceDue.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- MODAL AÑADIR PAGO (ESTILIZADO) ---
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
        // Validación básica
        if (paymentAmount <= 0 || paymentAmount > balanceDue + 0.01) { // +0.01 por redondeo
            toast.error(`Monto inválido. Máximo: L ${balanceDue.toFixed(2)}`);
            return;
        }
        setLoading(true);
        try {
            await addPaymentToInvoice(invoice, { amount: paymentAmount, paymentMethod, reference });
            toast.success('Abono registrado');
            onClose();
        } catch (error) { toast.error('Error al registrar abono'); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Abono</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FiX size={20}/></button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex justify-between items-center">
                    <span className="text-blue-600 font-medium text-sm">Saldo Pendiente</span>
                    <span className="text-blue-800 font-bold text-lg">L {balanceDue.toFixed(2)}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a Abonar</label>
                        <div className="relative">
                            <FiDollarSign className="absolute left-3 top-3.5 text-slate-400"/>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-colors outline-none font-bold text-slate-800" placeholder="0.00" step="0.01" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-slate-700">
                            <option>Efectivo</option><option>Transferencia Bancaria</option><option>Tarjeta de Crédito/Débito</option><option>Cheque</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia (Opcional)</label>
                        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="# Recibo o Transferencia" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-slate-700" />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
                            {loading ? '...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// --- MODAL ANULAR (ESTILIZADO) ---
const AnullInvoiceModal = ({ isOpen, onClose, invoice, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(isOpen) setReason(''); }, [isOpen]);

    const handleSubmit = async () => {
        if (!reason) { toast.warn("Razón requerida"); return; }
        setLoading(true);
        await onConfirm(reason);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-rose-500">
                <h2 className="text-xl font-bold text-slate-800 mb-2">¿Anular Factura?</h2>
                <p className="text-slate-500 text-sm mb-6">Esta acción devolverá los productos al inventario. No se puede deshacer.</p>
                
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la anulación..." className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl focus:border-rose-500 outline-none text-slate-700 h-24 mb-6 resize-none" />
                
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50">
                        {loading ? 'Anulando...' : 'Confirmar'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// --- PÁGINA PRINCIPAL DE FACTURAS ---
const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isAnullModalOpen, setIsAnullModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        const unsubscribe = getInvoices((fetchedInvoices) => { setInvoices(fetchedInvoices); setLoading(false); });
        return () => unsubscribe();
    }, []);

    const filteredInvoices = invoices.filter(invoice =>
        (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.status?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const openPaymentModal = (inv) => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); };
    const openDetailModal = (inv) => { setSelectedInvoice(inv); setIsDetailModalOpen(true); };
    const openAnullModal = (inv) => { setSelectedInvoice(inv); setIsAnullModalOpen(true); };
    const closeModal = () => { setIsPaymentModalOpen(false); setIsDetailModalOpen(false); setIsAnullModalOpen(false); setSelectedInvoice(null); };

    const handleAnullConfirm = async (reason) => {
        if (!selectedInvoice) return;
        try {
            await anullInvoice(selectedInvoice, reason);
            toast.success(`Factura anulada.`);
            closeModal();
        } catch (error) { toast.error(`Error: ${error.message}`); }
    };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                
                {/* Cabecera */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cuentas por Cobrar</h1>
                        <p className="text-slate-500 font-medium">Historial y gestión de cobros</p>
                    </div>
                    <Link to="/facturas/crear" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap">
                        <FiPlus /> Nueva Factura
                    </Link>
                </div>

                {/* Tabla Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    
                    {/* Barra Busqueda */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative max-w-md">
                            <FiSearch className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar por # Factura, Cliente o Estado..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>
                    
                    {/* Tabla */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4"># Factura</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-right">Pagado</th><th className="px-6 py-4 text-right">Saldo</th>
                                    <th className="px-6 py-4 text-center">Estado</th><th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? ( <tr><td colSpan="8" className="p-10 text-center text-slate-400">Cargando facturas...</td></tr> ) : 
                                filteredInvoices.length > 0 ? (
                                    filteredInvoices.map(invoice => {
                                        const balanceDue = invoice.balanceDue ?? invoice.total;
                                        const amountPaid = invoice.amountPaid || 0;
                                        const isFullyPaid = balanceDue <= 0.001;

                                        return (
                                            <tr key={invoice.id} className={`hover:bg-slate-50 transition-colors ${invoice.status === 'Anulada' ? 'opacity-60 bg-slate-50' : ''}`}>
                                                <td className="px-6 py-4 font-mono font-medium text-slate-700">{invoice.invoiceNumber}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800">{invoice.clientName}</td>
                                                <td className="px-6 py-4 text-slate-500">{invoice.issueDate}</td>
                                                <td className="px-6 py-4 font-medium text-right text-slate-700">L {invoice.total.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-emerald-600 font-medium">L {amountPaid.toFixed(2)}</td>
                                                <td className={`px-6 py-4 font-bold text-right ${isFullyPaid ? 'text-slate-300' : 'text-rose-500'}`}>{balanceDue.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[invoice.status] || statusStyles['Pendiente']}`}>
                                                        {invoice.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openDetailModal(invoice)} title="Ver Detalles" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><FiEye size={18}/></button>
                                                        <button onClick={() => openPaymentModal(invoice)} title="Abonar" disabled={isFullyPaid || invoice.status === 'Anulada'} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                                            <FiDollarSign size={18}/>
                                                        </button>
                                                        <button onClick={() => openAnullModal(invoice)} title="Anular" disabled={invoice.status === 'Anulada'} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                                            <FiXOctagon size={18}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan="8" className="p-10 text-center flex flex-col items-center justify-center text-slate-400"><FiFileText size={40} className="mb-2 opacity-30"/>No se encontraron facturas.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Renderizado de Modales */}
            <AnimatePresence>
                {selectedInvoice && (
                    <>
                        <AddPaymentModal isOpen={isPaymentModalOpen} onClose={closeModal} invoice={selectedInvoice} />
                        <InvoiceDetailModal isOpen={isDetailModalOpen} onClose={closeModal} invoice={selectedInvoice} />
                        <AnullInvoiceModal isOpen={isAnullModalOpen} onClose={closeModal} invoice={selectedInvoice} onConfirm={handleAnullConfirm} />
                    </>
                )}
            </AnimatePresence>
        </AnimatedPage>
    );
};

export default Invoices;