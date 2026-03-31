import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select'; 
import { getClients } from '../firebase/clientService';
import { getProductTypesStream } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { FiTrash2, FiShoppingCart, FiUser, FiPackage, FiCheckCircle, FiTag, FiBriefcase, FiPercent, FiDollarSign } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [inventoryLots, setInventoryLots] = useState([]);
    
    // Metadatos
    const [selectedClientId, setSelectedClientId] = useState('');
    const [businessType, setBusinessType] = useState('Farmacia');
    const [saleType, setSaleType] = useState('Contado');
    const [saleLocation, setSaleLocation] = useState('');
    
    // Estados de Producto
    const [selectedProductOption, setSelectedProductOption] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [bonusQuantity, setBonusQuantity] = useState('');
    
    // Estados Finales
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(''); // AHORA ES PORCENTAJE
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const u1 = getClients(setClients);
        const u2 = getProductTypesStream(setProductTypes);
        const u3 = getInventoryLotsStream(setInventoryLots);
        getNextInvoiceNumber().then(setInvoiceNumber);
        return () => { u1(); u2(); u3(); };
    }, []);

    const productOptions = useMemo(() => {
        return productTypes.map(p => {
            const stockSPS = inventoryLots.filter(l => l.productId === p.id).reduce((acc, l) => acc + (l.stockSPS || 0), 0);
            const stockTGU = inventoryLots.filter(l => l.productId === p.id).reduce((acc, l) => acc + (l.stockTGU || 0), 0);
            const stockTotal = saleLocation === 'SPS' ? stockSPS : stockTGU;
            return {
                value: p.id, label: `${p.name} (Stock: ${stockTotal})`,
                price: p.price, name: p.name, stock: stockTotal
            };
        });
    }, [productTypes, inventoryLots, saleLocation]);

    const handleAddItem = () => {
        if (!saleLocation) return toast.error("Selecciona la sede primero.");
        if (!selectedProductOption) return toast.warn("Selecciona un producto.");
        const q = Number(quantity) || 0; 
        const b = Number(bonusQuantity) || 0;
        if (q <= 0 && b <= 0) return toast.warn("Ingresa cantidad.");
        if (selectedProductOption.stock < (q + b)) return toast.error("Stock insuficiente.");

        const newLines = [];
        if (q > 0) newLines.push({ itemId: `${selectedProductOption.value}-v-${Date.now()}`, productId: selectedProductOption.value, name: selectedProductOption.name, quantity: q, price: Number(selectedProductOption.price), isBonus: false });
        if (b > 0) newLines.push({ itemId: `${selectedProductOption.value}-b-${Date.now()}`, productId: selectedProductOption.value, name: selectedProductOption.name, quantity: b, price: 0, isBonus: true });

        setInvoiceItems([...invoiceItems, ...newLines]);
        setSelectedProductOption(null); setQuantity(''); setBonusQuantity('');
    };

    // --- LÓGICA DE CÁLCULO POR PORCENTAJE ---
    const totals = useMemo(() => {
        const subtotalBruto = invoiceItems
            .filter(i => !i.isBonus)
            .reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Calcular el valor del descuento basado en el %
        const pct = Number(discountPercent) || 0;
        const discountValue = subtotalBruto * (pct / 100);
        
        const subtotalNeto = subtotalBruto - discountValue;
        const tax = subtotalNeto * 0.15;
        const total = subtotalNeto + tax;
        
        return { subtotalBruto, discountValue, subtotalNeto, tax, total };
    }, [invoiceItems, discountPercent]);

    const handleSubmit = async () => {
        if (!selectedClientId || !saleLocation || !invoiceItems.length) return toast.error("Faltan datos.");
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        const invoiceData = {
            invoiceNumber, issueDate: new Date().toISOString().split('T')[0],
            status: saleType === 'Contado' ? 'Pagada' : 'Pendiente',
            clientId: client.id, clientName: client.name, businessType, saleType, saleLocation,
            items: invoiceItems, 
            discountPercent: Number(discountPercent || 0), // Guardamos el % aplicado
            globalDiscount: totals.discountValue, // Guardamos el monto calculado
            ...totals,
            amountPaid: saleType === 'Contado' ? totals.total : 0,
            balanceDue: saleType === 'Contado' ? 0 : totals.total
        };
        try { await addInvoiceAndProcessStock(invoiceData, saleLocation); toast.success("Factura Generada"); navigate('/facturas'); } 
        catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Nueva Factura <span className="text-blue-500 font-mono text-xl ml-2">#{invoiceNumber}</span></h1>
                    <button onClick={() => {setInvoiceItems([]); setDiscountPercent('')}} className="text-rose-500 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl">Limpiar Todo</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiUser/> Configuración</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                                        <option value="">Seleccionar Cliente...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><FiBriefcase size={14}/> Negocio</label>
                                        <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                                            <option value="Farmacia">Farmacia</option>
                                            <option value="Naturista">Naturista</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><FiTag size={14}/> Venta</label>
                                        <select value={saleType} onChange={e => setSaleType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-blue-600">
                                            <option value="Contado">Contado</option>
                                            <option value="Crédito">Crédito</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sede de Despacho</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['SPS', 'TGU'].map(loc => (
                                            <button key={loc} onClick={() => setSaleLocation(loc)} className={`py-3 rounded-xl border font-bold transition-all ${saleLocation === loc ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                                {loc === 'SPS' ? 'San Pedro Sula' : 'Tegucigalpa'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all ${!saleLocation ? 'opacity-40 pointer-events-none' : ''}`}>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiPackage/> Productos</h3>
                            <Select
                                options={productOptions} value={selectedProductOption} onChange={setSelectedProductOption}
                                placeholder="Escribe el nombre del producto..." isSearchable noOptionsMessage={() => "No se encontró el producto"}
                                styles={{ control: (b) => ({ ...b, borderRadius: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }) }}
                            />
                            <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                                <div><label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Venta</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" placeholder="0"/></div>
                                <div><label className="text-xs font-bold text-emerald-600 block mb-1 uppercase">Bono</label>
                                <input type="number" value={bonusQuantity} onChange={e => setBonusQuantity(e.target.value)} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl outline-none font-bold text-emerald-700" placeholder="0"/></div>
                            </div>
                            <button onClick={handleAddItem} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">Agregar Item</button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col flex-grow">
                            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center font-bold text-slate-700 text-xs">
                                <span><FiShoppingCart className="inline mr-2"/> ARTÍCULOS</span>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full">{invoiceItems.length} Líneas</span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto max-h-[350px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white sticky top-0 text-slate-400 font-bold text-[10px] uppercase tracking-wider z-10 shadow-sm">
                                        <tr><th className="p-4">Descripción</th><th className="p-4 text-center">Cant.</th><th className="p-4 text-right">Unitario</th><th className="p-4 text-right">Total</th><th className="p-4"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {Object.values(invoiceItems.reduce((acc, item) => {
                                            if (!acc[item.productId]) acc[item.productId] = { ...item, q: 0, b: 0, p: 0 };
                                            if (item.isBonus) acc[item.productId].b += item.quantity;
                                            else { acc[item.productId].q += item.quantity; acc[item.productId].p = item.price; }
                                            return acc;
                                        }, {})).map(item => (
                                            <tr key={item.productId} className="hover:bg-slate-50">
                                                <td className="p-4"><div className="font-bold text-slate-800">{item.name}</div>
                                                {item.b > 0 && <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">Incluye {item.b} bonificados</span>}</td>
                                                <td className="p-4 text-center font-bold text-slate-700">{item.q} {item.b > 0 && <span className="text-emerald-500">+{item.b}</span>}</td>
                                                <td className="p-4 text-right text-slate-500">L {item.p.toFixed(2)}</td>
                                                <td className="p-4 text-right font-black text-slate-900">L {(item.q * item.p).toFixed(2)}</td>
                                                <td className="p-4 text-center"><button onClick={() => setInvoiceItems(invoiceItems.filter(i => i.productId !== item.productId))} className="text-rose-400"><FiTrash2/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-900 p-8 text-white space-y-4">
                                <div className="flex justify-between items-center text-slate-400 text-sm">
                                    <span>SUBTOTAL BRUTO:</span><span className="font-mono">L {totals.subtotalBruto.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center border-y border-slate-800 py-4">
                                    <div className="flex items-center gap-2 text-blue-400 text-sm font-black uppercase tracking-widest">
                                        <FiTag/> DESCUENTO (%) :
                                    </div>
                                    <div className="relative w-32">
                                        <input 
                                            type="text" inputMode="decimal"
                                            value={discountPercent} 
                                            onChange={e => setDiscountPercent(e.target.value.replace(/[^0-9.]/g, ''))} 
                                            className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-2 px-4 text-right font-mono text-xl text-blue-400 focus:border-blue-500 outline-none"
                                            placeholder="0"
                                        />
                                        <FiPercent className="absolute left-3 top-3.5 text-slate-600" size={14}/>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-rose-400 font-bold uppercase">
                                        <span>Valor Descontado:</span><span>- L {totals.discountValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium text-slate-300">
                                        <span>NETO SIN IMPUESTO:</span><span className="font-mono font-bold">L {totals.subtotalNeto.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>ISV (15%):</span><span className="font-mono">L {totals.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-2">
                                        <span className="text-xl font-black tracking-tighter uppercase text-blue-400">Total Factura:</span>
                                        <span className="text-4xl font-black text-white font-mono">L {totals.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button onClick={handleSubmit} disabled={loading || !invoiceItems.length} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 text-lg flex items-center justify-center gap-3">
                                    {loading ? 'PROCESANDO...' : <><FiDollarSign/> GUARDAR VENTA</>}
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