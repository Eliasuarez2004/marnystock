import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClients } from '../firebase/clientService';
import { getProductTypesStream } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { FiTrash2, FiShoppingCart, FiUser, FiMapPin, FiPackage, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [inventoryLots, setInventoryLots] = useState([]);
    
    // Form State
    const [selectedClientId, setSelectedClientId] = useState('');
    const [saleLocation, setSaleLocation] = useState('');
    const [productToAdd, setProductToAdd] = useState('');
    const [quantity, setQuantity] = useState('');
    const [bonusQuantity, setBonusQuantity] = useState('');
    
    // Invoice State
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const u1 = getClients(setClients);
        const u2 = getProductTypesStream(setProductTypes);
        const u3 = getInventoryLotsStream(setInventoryLots);
        getNextInvoiceNumber().then(setInvoiceNumber);
        return () => { u1(); u2(); u3(); };
    }, []);

    const getStock = (pid, loc) => {
        if (!pid || !loc) return 0;
        const field = loc === 'SPS' ? 'stockSPS' : 'stockTGU';
        return inventoryLots.filter(l => l.productId === pid).reduce((acc, l) => acc + (l[field] || 0), 0);
    };

    const handleAddItem = () => {
        if (!saleLocation) return toast.error("Selecciona la sede primero.");
        if (!productToAdd) return toast.warn("Selecciona un producto.");
        const q = Number(quantity) || 0, b = Number(bonusQuantity) || 0;
        if (q <= 0 && b <= 0) return toast.warn("Ingresa cantidad.");

        const prod = productTypes.find(p => p.id === productToAdd);
        const stock = getStock(prod.id, saleLocation);
        const currentInCart = invoiceItems.filter(i => i.productId === prod.id).reduce((s, i) => s + i.quantity, 0);

        if (stock < (currentInCart + q + b)) return toast.error(`Stock insuficiente. Disponible: ${stock}`);

        const newLines = [];
        if (q > 0) newLines.push({ itemId: `${prod.id}-s-${Date.now()}`, productId: prod.id, name: prod.name, quantity: q, price: Number(prod.price), isBonus: false });
        if (b > 0) newLines.push({ itemId: `${prod.id}-b-${Date.now()}`, productId: prod.id, name: prod.name, quantity: b, price: Number(prod.price), isBonus: true });

        setInvoiceItems([...invoiceItems, ...newLines]);
        setProductToAdd(''); setQuantity(''); setBonusQuantity('');
    };

    const totals = useMemo(() => {
        const gross = invoiceItems.reduce((a, i) => a + (i.price * i.quantity), 0);
        const disc = invoiceItems.filter(i => i.isBonus).reduce((a, i) => a + (i.price * i.quantity), 0);
        const sub = gross - disc;
        return { totalBeforeDiscount: gross, discountAmount: disc, subtotal: sub, tax: sub * 0.15, total: sub * 1.15 };
    }, [invoiceItems]);

    const handleSubmit = async () => {
        if (!selectedClientId || !saleLocation || !invoiceItems.length) return toast.error("Faltan datos.");
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        const invoiceData = {
            invoiceNumber, issueDate: new Date().toISOString().split('T')[0], status: 'Pendiente',
            clientId: client.id, clientName: client.name, saleLocation, items: invoiceItems, ...totals
        };
        try { await addInvoiceAndProcessStock(invoiceData, saleLocation); toast.success("Factura Creada"); navigate('/facturas'); } 
        catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    // Group items visually for the table
    const groupedDisplay = useMemo(() => {
        const g = {};
        invoiceItems.forEach(i => {
            if(!g[i.productId]) g[i.productId] = { ...i, qty: 0, bonus: 0 };
            if(i.isBonus) g[i.productId].bonus += i.quantity;
            else g[i.productId].qty += i.quantity;
        });
        return Object.values(g);
    }, [invoiceItems]);

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Nueva Factura <span className="text-slate-400 font-light text-xl ml-2">#{invoiceNumber}</span></h1>
                    {invoiceItems.length > 0 && <button onClick={() => setInvoiceItems([])} className="text-red-500 hover:text-red-700 font-medium text-sm">Limpiar Todo</button>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: INPUTS */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Config Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><FiUser/> Datos Generales</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} disabled={invoiceItems.length > 0} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all">
                                        <option value="">Seleccionar Cliente...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sede de Venta</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['SPS', 'TGU'].map(loc => (
                                            <button key={loc} onClick={() => !invoiceItems.length && setSaleLocation(loc)} className={`p-3 rounded-xl border font-medium transition-all ${saleLocation === loc ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                {loc === 'SPS' ? 'San Pedro Sula' : 'Tegucigalpa'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Add Card */}
                        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-opacity ${!saleLocation ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><FiPackage/> Agregar Productos</h3>
                            <select value={productToAdd} onChange={e => setProductToAdd(e.target.value)} className="w-full p-3 mb-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none">
                                <option value="">Buscar producto...</option>
                                {productTypes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} — Stock: {getStock(p.id, saleLocation)}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">CANTIDAD</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-800" placeholder="0"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-emerald-600">BONIFICACIÓN (12+1)</label>
                                    <input type="number" value={bonusQuantity} onChange={e => setBonusQuantity(e.target.value)} className="w-full mt-1 p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-emerald-800" placeholder="0"/>
                                </div>
                            </div>
                            <button onClick={handleAddItem} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-transform active:scale-95">
                                Agregar a la Orden
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PREVIEW */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex-grow flex flex-col overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2"><FiShoppingCart/> Resumen de Orden</h3>
                                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">{invoiceItems.length} Items</span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-0">
                                {invoiceItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <FiShoppingCart size={48} className="mb-4 opacity-50"/>
                                        <p>El carrito está vacío</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white text-slate-500 sticky top-0 shadow-sm">
                                            <tr><th className="p-4">Producto</th><th className="p-4 text-center">Cant.</th><th className="p-4 text-right">Total</th><th className="p-4"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <AnimatePresence>
                                                {groupedDisplay.map(item => (
                                                    <motion.tr key={item.productId} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="hover:bg-slate-50">
                                                        <td className="p-4">
                                                            <div className="font-medium text-slate-800">{item.name}</div>
                                                            {item.bonus > 0 && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><FiCheckCircle size={10}/> {item.bonus} Bonificado</span>}
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-slate-700">{item.qty}</td>
                                                        <td className="p-4 text-right font-medium text-slate-600">L {(item.qty * item.price).toFixed(2)}</td>
                                                        <td className="p-4 text-center">
                                                            <button onClick={() => setInvoiceItems(invoiceItems.filter(i => i.productId !== item.productId))} className="text-rose-400 hover:text-rose-600"><FiTrash2/></button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* TOTALS FOOTER */}
                            <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-2">
                                <div className="flex justify-between text-sm text-slate-500"><span>Subtotal:</span> <span>L {totals.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-slate-500"><span>ISV (15%):</span> <span>L {totals.tax.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                    <span className="text-lg font-bold text-slate-800">Total a Pagar</span>
                                    <span className="text-2xl font-black text-blue-600">L {totals.total.toFixed(2)}</span>
                                </div>
                                <button onClick={handleSubmit} disabled={loading || !invoiceItems.length} className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none">
                                    {loading ? 'Procesando...' : 'Confirmar Factura'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
};
export default CreateInvoice;