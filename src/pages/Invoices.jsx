import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getInvoicePayments, addPaymentToInvoice, anullInvoice } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { toast } from 'react-toastify';
import { FiEye, FiPlus, FiXOctagon, FiSearch, FiFileText, FiX, FiCheck, FiDollarSign, FiGift } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';

// --- CONFIGURACIÓN DE ESTILOS ---
const STATUS_STYLES = {
    'Pagada': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Abonada': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pendiente': 'bg-amber-100 text-amber-700 border-amber-200',
    'Anulada': 'bg-slate-100 text-slate-500 border-slate-200 line-through decoration-slate-400',
};

// ==========================================
// SUB-COMPONENTE: FILA DE ARTÍCULO EN DETALLE
// ==========================================
const DetailItemRow = ({ item }) => {
    // Buscamos la línea de venta (la que tiene precio) y la de bono
    const saleLine = item.lines.find(l => !l.isBonus);
    const bonusLine = item.lines.find(l => l.isBonus);

    const price = saleLine?.price || 0;
    const saleQty = saleLine?.quantity || 0;
    const bonusQty = bonusLine?.quantity || 0;
    const totalLine = price * saleQty;

    return (
        <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <td className="p-3">
                <div className="font-bold text-slate-800">{item.name}</div>
                {bonusQty > 0 && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-1 uppercase">
                        <FiGift size={10}/> Incluye {bonusQty} Bonificados
                    </div>
                )}
            </td>
            <td className="p-3 text-center font-bold text-slate-700">
                {saleQty} {bonusQty > 0 && <span className="text-emerald-500">+{bonusQty}</span>}
            </td>
            <td className="p-3 text-right text-slate-500 font-mono">L {price.toFixed(2)}</td>
            <td className="p-3 text-right font-black text-slate-900 font-mono">L {totalLine.toFixed(2)}</td>
        </tr>
    );
};

// ==========================================
// COMPONENTE: MODAL DE DETALLE DE FACTURA
// ==========================================
const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
    const [payments, setPayments] = useState([]);
    
    useEffect(() => {
        if (isOpen && invoice?.id) {
            const unsubscribe = getInvoicePayments(invoice.id, setPayments);
            return () => unsubscribe();
        }
    }, [isOpen, invoice]);

    const groupedItems = useMemo(() => {
        if (!invoice?.items) return [];
        const groups = {};
        invoice.items.forEach(item => {
            if (!groups[item.productId]) {
                groups[item.productId] = { productId: item.productId, name: item.name, lines: [] };
            }
            groups[item.productId].lines.push(item);
        });
        return Object.values(groups);
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    // Mapeo de campos correctos
    const {
        subtotalBruto = 0,
        globalDiscount = 0,
        subtotalNeto = 0,
        tax = 0,
        total = 0,
        amountPaid = 0,
        balanceDue = 0,
        saleType,
        businessType,
        saleLocation,
        issueDate,
        invoiceNumber
    } = invoice;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">FACTURA <span className="text-blue-600 font-mono">#{invoiceNumber}</span></h2>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${saleType === 'Contado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                {saleType}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                            <p className="text-slate-500 font-medium">Cliente: <span className="text-slate-900 font-bold">{invoice.clientName}</span></p>
                            <p className="text-slate-500 font-medium">Negocio: <span className="text-slate-900 font-bold">{businessType}</span></p>
                            <p className="text-slate-500 font-medium">Fecha: <span className="text-slate-900 font-bold">{issueDate}</span></p>
                            <p className="text-slate-500 font-medium">Sede: <span className="text-slate-900 font-bold">{saleLocation === 'SPS' ? 'San Pedro Sula' : 'Tegucigalpa'}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 transition-all shadow-sm"><FiX size={24}/></button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
                    {/* Lista Artículos */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b">
                                <tr><th className="p-4">Descripción</th><th className="p-4 text-center">Cant.</th><th className="p-4 text-right">Unitario</th><th className="p-4 text-right">Subtotal</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {groupedItems.map(item => <DetailItemRow key={item.productId} item={item} />)}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagos / Abonos */}
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Historial de Transacciones</h3>
                        {payments.length > 0 ? (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                        <tr><th className="p-4">Fecha</th><th className="p-4">Método</th><th className="p-4 text-right">Monto Recibido</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {payments.map(p => (
                                            <tr key={p.id} className="text-slate-600">
                                                <td className="p-4">{p.paymentDate}</td>
                                                <td className="p-4">{p.paymentMethod}</td>
                                                <td className="p-4 text-right font-black text-emerald-600 font-mono">L {p.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 font-medium italic">
                                No se registran abonos previos.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Totales */}
                <div className="bg-slate-900 p-8 text-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2 border-r border-slate-800 pr-8">
                            <div className="flex justify-between text-xs text-slate-400"><span>SUBTOTAL BRUTO:</span><span className="font-mono">L {subtotalBruto.toFixed(2)}</span></div>
                            <div className="flex justify-between text-xs text-rose-400 font-bold"><span>DESCUENTO GLOBAL:</span><span className="font-mono">- L {globalDiscount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm text-slate-200 border-t border-slate-800 pt-2 font-bold"><span>SUBTOTAL NETO:</span><span className="font-mono">L {subtotalNeto.toFixed(2)}</span></div>
                            <div className="flex justify-between text-xs text-slate-400"><span>ISV (15%):</span><span className="font-mono text-rose-300">L {tax.toFixed(2)}</span></div>
                        </div>

                        <div className="flex flex-col justify-center items-end">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Total Facturado</span>
                            <div className="text-5xl font-black text-white font-mono tracking-tighter mb-4">L {total.toFixed(2)}</div>
                            
                            <div className="flex gap-3 w-full">
                                <div className="flex-1 bg-slate-800/50 rounded-2xl p-3 border border-slate-800 text-center">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Pagado</p>
                                    <p className="text-lg font-black text-emerald-400 font-mono">L {amountPaid.toFixed(2)}</p>
                                </div>
                                <div className="flex-1 bg-slate-800/50 rounded-2xl p-3 border border-slate-800 text-center">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Saldo Pendiente</p>
                                    <p className={`text-lg font-black font-mono ${balanceDue > 0 ? 'text-rose-500' : 'text-slate-500'}`}>L {balanceDue.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ==========================================
// COMPONENTE: MODAL AÑADIR PAGO
// ==========================================
const AddPaymentModal = ({ isOpen, onClose, invoice }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !invoice) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        if (paymentAmount <= 0 || paymentAmount > invoice.balanceDue + 0.01) {
            toast.error("Monto inválido."); return;
        }
        setLoading(true);
        try {
            await addPaymentToInvoice(invoice, { amount: paymentAmount, paymentMethod, reference });
            toast.success('Abono registrado'); onClose();
        } catch { toast.error('Error al registrar'); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Registrar Abono</h2>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6 flex justify-between items-center">
                    <span className="text-blue-600 font-bold text-xs uppercase">Pendiente de Cobro:</span>
                    <span className="text-blue-900 font-black text-xl font-mono">L {invoice.balanceDue.toFixed(2)}</span>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto (L)" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-black text-xl" />
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
                        <option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option>
                    </select>
                    <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Referencia / # Recibo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                    <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase">
                        {loading ? 'Procesando...' : 'Confirmar Abono'}
                    </button>
                    <button type="button" onClick={onClose} className="w-full text-slate-400 font-bold text-sm">Cancelar</button>
                </form>
            </motion.div>
        </div>
    );
};

// ==========================================
// COMPONENTE: MODAL ANULAR
// ==========================================
const AnullInvoiceModal = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;
    return (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-black text-rose-600 mb-2 uppercase tracking-tight">¿Anular Factura?</h2>
                <p className="text-slate-500 text-sm mb-6 font-medium">Esta acción revertirá el stock de los productos. Es irreversible.</p>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo de la anulación..." className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none focus:border-rose-500 h-32 mb-6 resize-none font-medium text-slate-700" />
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 uppercase transition-all">No, atrás</button>
                    <button onClick={async () => { setLoading(true); await onConfirm(reason); setLoading(false); }} disabled={loading} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all uppercase">
                        {loading ? '...' : 'Sí, anular'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ==========================================
// PÁGINA PRINCIPAL: INVOICES
// ==========================================
const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [modals, setModals] = useState({ payment: false, detail: false, anull: false });

    useEffect(() => {
        const unsubscribe = getInvoices((data) => { setInvoices(data); setLoading(false); });
        return () => unsubscribe();
    }, []);

    const filtered = invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (type, inv) => { setSelectedInvoice(inv); setModals({ ...modals, [type]: true }); };
    const closeModals = () => { setModals({ payment: false, detail: false, anull: false }); setSelectedInvoice(null); };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                {/* Header Page */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">CUENTAS POR COBRAR</h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Control maestro de facturación</p>
                    </div>
                    <Link to="/facturas/crear" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-3 transition-transform active:scale-95 whitespace-nowrap">
                        <FiPlus size={20} /> NUEVA FACTURA
                    </Link>
                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="relative max-w-lg">
                            <FiSearch className="absolute left-4 top-4 text-slate-400" />
                            <input type="text" placeholder="Buscar por cliente o # factura..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                <tr>
                                    <th className="px-8 py-5">Factura</th><th className="px-8 py-5">Cliente / Fecha</th>
                                    <th className="px-8 py-5 text-right">Total</th><th className="px-8 py-5 text-right">Saldo</th>
                                    <th className="px-8 py-5 text-center">Estado</th><th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">Cargando base de datos...</td></tr>
                                ) : filtered.length > 0 ? filtered.map(inv => (
                                    <tr key={inv.id} className={`hover:bg-slate-50/80 transition-colors ${inv.status === 'Anulada' ? 'bg-slate-50/50' : ''}`}>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-900 font-mono text-lg">{inv.invoiceNumber}</div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{inv.saleType}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-800">{inv.clientName}</div>
                                            <div className="text-xs text-slate-400 font-medium">{inv.issueDate}</div>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900">L {inv.total.toFixed(2)}</td>
                                        <td className={`px-8 py-6 text-right font-black font-mono text-lg ${inv.balanceDue > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                            {inv.balanceDue.toFixed(2)}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLES[inv.status] || STATUS_STYLES['Pendiente']}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openModal('detail', inv)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><FiEye size={20}/></button>
                                                <button onClick={() => openModal('payment', inv)} disabled={inv.balanceDue <= 0.01 || inv.status === 'Anulada'} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl disabled:opacity-20 transition-all"><FiDollarSign size={20}/></button>
                                                <button onClick={() => openModal('anull', inv)} disabled={inv.status === 'Anulada'} className="p-3 text-rose-400 hover:bg-rose-50 rounded-2xl disabled:opacity-20 transition-all"><FiXOctagon size={20}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="p-20 text-center"><FiFileText size={48} className="mx-auto text-slate-200 mb-4"/><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron facturas</p></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {selectedInvoice && (
                    <>
                        <AddPaymentModal isOpen={modals.payment} onClose={closeModals} invoice={selectedInvoice} />
                        <InvoiceDetailModal isOpen={modals.detail} onClose={closeModals} invoice={selectedInvoice} />
                        <AnullInvoiceModal isOpen={modals.anull} onClose={closeModals} invoice={selectedInvoice} onConfirm={async (reason) => { await anullInvoice(selectedInvoice, reason); toast.success("Factura anulada."); closeModals(); }} />
                    </>
                )}
            </AnimatePresence>
        </AnimatedPage>
    );
};

export default Invoices;