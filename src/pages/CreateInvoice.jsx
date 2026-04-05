import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select'; 
import { getClients } from '../firebase/clientService';
import { getProductTypesStream } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { 
    FiTrash2, FiShoppingCart, FiUser, FiPackage, FiCheckCircle, 
    FiTag, FiBriefcase, FiPercent, FiDollarSign, FiCalendar, 
    FiHash, FiMapPin, FiStar, FiLock 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [inventoryLots, setInventoryLots] = useState([]);
    
    // --- METADATOS DE IDENTIDAD ---
    const [invoiceNumber, setInvoiceNumber] = useState(''); 
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [businessType, setBusinessType] = useState('Farmacia');
    const [saleType, setSaleType] = useState('Contado');
    const [saleLocation, setSaleLocation] = useState('');
    
    // --- ESTADOS DE PRODUCTO Y PRECIO ---
    const [selectedProductOption, setSelectedProductOption] = useState(null);
    const [customPrice, setCustomPrice] = useState(''); // Para manejar el precio editable
    const [quantity, setQuantity] = useState('');
    const [bonusQuantity, setBonusQuantity] = useState('');
    
    // --- ESTADOS DE FACTURA ---
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(''); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const u1 = getClients(setClients);
        const u2 = getProductTypesStream(setProductTypes);
        const u3 = getInventoryLotsStream(setInventoryLots);
        getNextInvoiceNumber().then(res => setInvoiceNumber(res));
        return () => { u1(); u2(); u3(); };
    }, []);

    // Detectar si el cliente actual es especial
    const isSpecialClient = useMemo(() => {
        const client = clients.find(c => c.id === selectedClientId);
        return client?.isSpecial || false;
    }, [selectedClientId, clients]);

    // Cuando cambia el producto seleccionado, inicializamos su precio
    useEffect(() => {
        if (selectedProductOption) {
            setCustomPrice(selectedProductOption.price);
        } else {
            setCustomPrice('');
        }
    }, [selectedProductOption]);

    // Opciones del buscador con stock dinámico
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
        // Si es especial usa el precio del input, si no el del catálogo
        const priceToUse = isSpecialClient ? Number(customPrice) : Number(selectedProductOption.price);

        if (q <= 0 && b <= 0) return toast.warn("Ingresa cantidad o bono.");
        if (q > 0 && priceToUse <= 0) return toast.warn("El precio debe ser mayor a 0.");
        if (selectedProductOption.stock < (q + b)) return toast.error("Stock insuficiente.");

        const newLines = [];
        if (q > 0) {
            newLines.push({ 
                itemId: `${selectedProductOption.value}-v-${Date.now()}`, 
                productId: selectedProductOption.value, name: selectedProductOption.name, 
                quantity: q, price: priceToUse, isBonus: false 
            });
        }
        if (b > 0) {
            newLines.push({ 
                itemId: `${selectedProductOption.value}-b-${Date.now()}`, 
                productId: selectedProductOption.value, name: selectedProductOption.name, 
                quantity: b, price: 0, isBonus: true 
            });
        }

        setInvoiceItems([...invoiceItems, ...newLines]);
        setSelectedProductOption(null); setQuantity(''); setBonusQuantity(''); setCustomPrice('');
    };

    const totals = useMemo(() => {
        const subtotalBruto = invoiceItems.filter(i => !i.isBonus).reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const pct = Number(discountPercent) || 0;
        const discountValue = subtotalBruto * (pct / 100);
        const subtotalNeto = subtotalBruto - discountValue;
        const tax = subtotalNeto * 0.15;
        const total = subtotalNeto + tax;
        return { subtotalBruto, discountValue, subtotalNeto, tax, total };
    }, [invoiceItems, discountPercent]);

    const handleSubmit = async () => {
        if (!invoiceNumber.trim()) return toast.error("Escribe el número de factura.");
        if (!selectedClientId || !saleLocation || !invoiceItems.length) return toast.error("Faltan datos obligatorios.");
        
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        
        const invoiceData = {
            invoiceNumber: invoiceNumber.trim().toUpperCase(),
            issueDate,
            systemEntryDate: new Date().toISOString(),
            status: saleType === 'Contado' ? 'Pagada' : 'Pendiente',
            clientId: client.id, 
            clientName: client.name, 
            clientDepartment: client.departamento || 'Cortés', // Heredamos ubicación para el mapa
            businessType, 
            saleType, 
            saleLocation,
            items: invoiceItems, 
            discountPercent: Number(discountPercent || 0),
            globalDiscount: totals.discountValue,
            ...totals,
            amountPaid: saleType === 'Contado' ? totals.total : 0,
            balanceDue: saleType === 'Contado' ? 0 : totals.total
        };

        try { 
            await addInvoiceAndProcessStock(invoiceData, saleLocation); 
            toast.success(`Factura ${invoiceNumber} guardada.`); 
            navigate('/facturas'); 
        } 
        catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Generar Factura</h1>
                        <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-1">Marny's de Honduras — Panel Administrativo</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="text-rose-500 font-black text-xs bg-rose-50 px-6 py-3 rounded-2xl hover:bg-rose-100 transition-all uppercase shadow-sm">Limpiar Todo</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* IDENTIDAD */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><FiHash/> Información de Documento</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-blue-400 transition-all shadow-inner">
                                    <label className="block text-[10px] font-black text-blue-600 uppercase mb-1"># Factura</label>
                                    <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full bg-transparent border-none p-0 outline-none font-mono font-black text-xl text-slate-800" placeholder="F-0000"/>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-blue-400 transition-all shadow-inner">
                                    <label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Fecha Emisión</label>
                                    <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full bg-transparent border-none p-0 outline-none font-bold text-slate-700 cursor-pointer"/>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2 ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FiUser/> Cliente</label>
                                        {isSpecialClient && <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-amber-200"><FiStar size={10}/> Cliente Especial</span>}
                                    </div>
                                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/10 shadow-inner">
                                        <option value="">-- Elige un cliente --</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.departamento || 'Sin Depto'})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-600 shadow-inner">
                                        <option value="Farmacia">Farmacia</option>
                                        <option value="Naturista">Naturista</option>
                                    </select>
                                    <select value={saleType} onChange={e => setSaleType(e.target.value)} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-blue-600 shadow-inner">
                                        <option value="Contado">Contado</option>
                                        <option value="Crédito">Crédito</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {['SPS', 'TGU'].map(loc => (
                                        <button key={loc} onClick={() => setSaleLocation(loc)} className={`py-4 rounded-2xl border-2 font-black transition-all text-xs uppercase tracking-widest ${saleLocation === loc ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                                            {loc === 'SPS' ? 'San Pedro Sula' : 'Tegucigalpa'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SELECCIÓN DE PRODUCTOS */}
                        <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all ${!saleLocation ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiPackage/> Selección de Artículos</h3>
                            <Select
                                options={productOptions} value={selectedProductOption} onChange={setSelectedProductOption}
                                placeholder="Buscar producto..." isSearchable 
                                styles={{ control: (b) => ({ ...b, borderRadius: '1rem', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '6px', fontWeight: 'bold' }) }}
                            />
                            
                            {/* --- PRECIO UNITARIO DINÁMICO --- */}
                            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio de Venta (LPS)</label>
                                    {!isSpecialClient && <FiLock className="text-slate-300" size={12} title="Solo clientes especiales pueden editar precios"/>}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">L</span>
                                    <input 
                                        type="number" 
                                        value={isSpecialClient ? customPrice : (selectedProductOption?.price || '')} 
                                        onChange={(e) => isSpecialClient && setCustomPrice(e.target.value)}
                                        readOnly={!isSpecialClient}
                                        className={`w-full p-4 pl-10 rounded-xl font-mono font-black text-2xl outline-none transition-all ${
                                            isSpecialClient 
                                            ? 'bg-white border-2 border-blue-200 text-blue-600 focus:border-blue-500 shadow-sm' 
                                            : 'bg-slate-100 border-transparent text-slate-500 cursor-not-allowed opacity-70'
                                        }`}
                                        placeholder="0.00"
                                    />
                                    {isSpecialClient && <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-600 px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter">Precio Especial</div>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
                                <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase ml-1">Cantidad</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xl shadow-inner" placeholder="0"/></div>
                                <div><label className="text-[10px] font-black text-emerald-500 block mb-2 uppercase ml-1">Bono</label>
                                <input type="number" value={bonusQuantity} onChange={e => setBonusQuantity(e.target.value)} className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none font-black text-xl text-emerald-700 shadow-inner" placeholder="0"/></div>
                            </div>
                            <button onClick={handleAddItem} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-xs tracking-[0.2em]">Agregar a Factura</button>
                        </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col flex-grow">
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <span className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-widest"><FiShoppingCart/> Detalle de Orden</span>
                                <div className="flex gap-2">
                                    <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-md shadow-blue-200">{invoiceItems.length} Líneas</span>
                                    <span className="bg-white border border-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2"><FiCalendar/> {issueDate}</span>
                                </div>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto max-h-[350px] custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white sticky top-0 text-slate-400 font-black text-[10px] uppercase tracking-widest z-10 shadow-sm border-b">
                                        <tr><th className="p-6">Producto</th><th className="p-6 text-center">Cant.</th><th className="p-6 text-right">Unitario</th><th className="p-6 text-right">Total</th><th className="p-6"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {Object.values(invoiceItems.reduce((acc, item) => {
                                            if (!acc[item.productId]) acc[item.productId] = { ...item, q: 0, b: 0, p: 0 };
                                            if (item.isBonus) acc[item.productId].b += item.quantity;
                                            else { acc[item.productId].q += item.quantity; acc[item.productId].p = item.price; }
                                            return acc;
                                        }, {})).map(item => (
                                            <tr key={item.productId} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-6">
                                                    <div className="font-black text-slate-800 tracking-tight leading-tight">{item.name}</div>
                                                    {item.b > 0 && <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center w-fit mt-2 animate-pulse"><FiCheckCircle size={10} className="mr-1"/> +{item.b} REGALÍA</span>}
                                                </td>
                                                <td className="p-6 text-center font-black text-slate-700 text-lg">{item.q}</td>
                                                <td className="p-6 text-right text-slate-400 font-bold">L {item.p.toFixed(2)}</td>
                                                <td className="p-6 text-right font-black text-slate-900 font-mono text-lg">L {(item.q * item.p).toFixed(2)}</td>
                                                <td className="p-6 text-center"><button onClick={() => setInvoiceItems(invoiceItems.filter(i => i.productId !== item.productId))} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"><FiTrash2 size={20}/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* TOTALES */}
                            <div className="bg-slate-900 p-8 text-white space-y-5">
                                <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]"><span>Subtotal Bruto (LPS)</span><span className="font-mono text-sm text-slate-300">L {totals.subtotalBruto.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center border-y border-slate-800 py-6">
                                    <div className="flex items-center gap-2 text-blue-400 text-sm font-black uppercase tracking-[0.2em]"><FiTag/> Descuento Global (%)</div>
                                    <div className="relative w-36">
                                        <input type="text" inputMode="decimal" value={discountPercent} onChange={e => setDiscountPercent(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-3 px-5 text-right font-mono text-2xl text-blue-400 focus:border-blue-500 outline-none shadow-2xl transition-all" placeholder="0"/>
                                        <FiPercent className="absolute left-4 top-4.5 text-slate-600" size={16}/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase text-rose-400 tracking-widest"><span>Valor Descontado</span><span className="font-mono">- L {totals.discountValue.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm font-bold text-slate-300 tracking-tight"><span>NETO SIN ISV:</span><span className="font-mono">L {totals.subtotalNeto.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 tracking-tight"><span>ISV (15%):</span><span className="font-mono text-rose-300">L {totals.tax.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center pt-8 border-t border-slate-800 mt-4">
                                        <span className="text-xl font-black tracking-tighter uppercase text-blue-400">Total a Cobrar</span>
                                        <div className="text-right"><span className="text-5xl font-black text-white font-mono tracking-tighter drop-shadow-lg">L {totals.total.toFixed(2)}</span></div>
                                    </div>
                                </div>
                                <button onClick={handleSubmit} disabled={loading || !invoiceItems.length} className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 text-xl flex items-center justify-center gap-4 uppercase">
                                    {loading ? 'Sincronizando...' : <><FiDollarSign size={28}/> Confirmar Factura</>}
                                </button>
                                <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest italic opacity-50">Dpto: {(clients.find(c => c.id === selectedClientId))?.departamento || '---'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
};
export default CreateInvoice;