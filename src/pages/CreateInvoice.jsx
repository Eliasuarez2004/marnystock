import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClients } from '../firebase/clientService';
import { getProductTypesStream } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { FiTrash2, FiShoppingCart, FiUser, FiPackage, FiCheckCircle, FiPercent, FiGift } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// --- REGLAS DE BONIFICACIÓN ---
const BONUS_RULES = [
    { value: 'NINGUNA', label: 'Ninguna (Venta Normal)', multiplier: 0, showBonusFields: false },
    { value: 'FARMACIA_CONTADO', label: 'Farmacia (Contado) - 12+1', multiplier: 12, showBonusFields: true },
    { value: 'FARMACIA_CREDITO', label: 'Farmacia (Crédito) - 12+1', multiplier: 12, showBonusFields: true },
    { value: 'NATURISTA_CONTADO', label: 'Naturista (Contado) - 12+1', multiplier: 12, showBonusFields: true },
    { value: 'NATURISTA_CREDITO', label: 'Naturista (Crédito) - 12+1', multiplier: 12, showBonusFields: true },
];

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [inventoryLots, setInventoryLots] = useState([]);
    
    // Estados del Formulario
    const [selectedClientId, setSelectedClientId] = useState('');
    const [saleLocation, setSaleLocation] = useState('');
    const [bonusRule, setBonusRule] = useState(BONUS_RULES[0].value); // NUEVO ESTADO
    const [productToAdd, setProductToAdd] = useState('');
    const [quantity, setQuantity] = useState('');
    const [bonusQuantity, setBonusQuantity] = useState('');
    const [bonusDiscount, setBonusDiscount] = useState(100); 
    
    // Estados de la Factura
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const currentRule = useMemo(() => BONUS_RULES.find(r => r.value === bonusRule), [bonusRule]);

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
        
        const q = Number(quantity) || 0; 
        let b = Number(bonusQuantity) || 0;
        const discRate = Number(bonusDiscount);

        // --- LÓGICA DE BONIFICACIÓN 12+1 (Automática) ---
        if (currentRule.multiplier > 0) {
            // Si la cantidad de venta es un múltiplo de la regla, CALCULAMOS el bono (12+1)
            const calculatedBonus = Math.floor(q / currentRule.multiplier);
            
            // Si el campo de bono manual (b) está vacío o es menor al bono calculado,
            // usamos el valor calculado. Si el vendedor pone un bono manual MAYOR, lo respetamos.
            if (calculatedBonus > b) {
                b = calculatedBonus;
            }
        }
        // ----------------------------------------------------

        if (q <= 0 && b <= 0) return toast.warn("Ingresa al menos una cantidad.");
        if (b > 0 && (discRate < 0 || discRate > 100)) return toast.warn("El descuento debe ser entre 0% y 100%");

        const prod = productTypes.find(p => p.id === productToAdd);
        const stock = getStock(prod.id, saleLocation);
        const currentInCart = invoiceItems.filter(i => i.productId === prod.id).reduce((s, i) => s + i.quantity, 0);

        if (stock < (currentInCart + q + b)) {
            return toast.error(`Stock insuficiente. Disponible en ${saleLocation}: ${stock}`);
        }

        const newLines = [];
        
        // 1. Item de Venta Normal
        if (q > 0) {
            newLines.push({ 
                itemId: `${prod.id}-s-${Date.now()}`, productId: prod.id, name: prod.name, 
                quantity: q, price: Number(prod.price), isBonus: false, discountRate: 0 
            });
        }

        // 2. Item de Bonificación
        if (b > 0) {
            newLines.push({ 
                itemId: `${prod.id}-b-${Date.now()}`, productId: prod.id, name: prod.name, 
                quantity: b, price: Number(prod.price), isBonus: true, discountRate: discRate 
            });
        }

        setInvoiceItems([...invoiceItems, ...newLines]);
        setProductToAdd(''); setQuantity(''); setBonusQuantity(''); setBonusDiscount(100); 
    };

    const totals = useMemo(() => {
        const gross = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        const discountAmount = invoiceItems.reduce((acc, item) => {
            if (item.isBonus) {
                return acc + ((item.price * item.quantity) * (item.discountRate / 100));
            }
            return acc;
        }, 0);

        const subtotal = gross - discountAmount;
        const tax = subtotal * 0.15; // 15% ISV
        const total = subtotal + tax;
        
        return { totalBeforeDiscount: gross, discountAmount, subtotal, tax, total };
    }, [invoiceItems]);

    const handleSubmit = async () => {
        if (!selectedClientId || !saleLocation || !invoiceItems.length) return toast.error("Faltan datos.");
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        
        const invoiceData = {
            invoiceNumber, issueDate: new Date().toISOString().split('T')[0], status: 'Pendiente',
            clientId: client.id, clientName: client.name, saleLocation, items: invoiceItems, ...totals
        };
        
        try { 
            await addInvoiceAndProcessStock(invoiceData, saleLocation); 
            toast.success("Factura Creada Exitosamente"); 
            navigate('/facturas'); 
        } 
        catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    const groupedDisplay = useMemo(() => {
        const g = {};
        invoiceItems.forEach(i => {
            if(!g[i.productId]) g[i.productId] = { ...i, qty: 0, bonus: 0, avgDiscount: 0 };
            
            if(i.isBonus) {
                g[i.productId].bonus += i.quantity;
                g[i.productId].avgDiscount = i.discountRate;
            } else {
                g[i.productId].qty += i.quantity;
            }
        });
        return Object.values(g);
    }, [invoiceItems]);

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        Nueva Factura <span className="text-slate-400 font-light text-xl ml-2">#{invoiceNumber}</span>
                    </h1>
                    {invoiceItems.length > 0 && <button onClick={() => setInvoiceItems([])} className="text-rose-500 hover:text-rose-700 font-medium text-sm bg-rose-50 px-3 py-1 rounded-lg">Limpiar Todo</button>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Tarjeta Datos Generales */}
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
                                
                                {/* SELECTOR DE REGLA DE BONIFICACIÓN (NUEVO) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><FiGift/> Regla de Bonificación</label>
                                    <select value={bonusRule} onChange={e => setBonusRule(e.target.value)} disabled={invoiceItems.length > 0} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-semibold text-slate-700">
                                        {BONUS_RULES.map(rule => <option key={rule.value} value={rule.value}>{rule.label}</option>)}
                                    </select>
                                    {currentRule.multiplier > 0 && <p className="text-xs text-slate-500 mt-1 pl-1">Aplica regla de {currentRule.multiplier}+1 automáticamente en la cantidad de bonificación.</p>}
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

                        {/* Tarjeta Agregar Productos */}
                        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-opacity ${!saleLocation ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><FiPackage/> Agregar Productos</h3>
                            
                            <select value={productToAdd} onChange={e => setProductToAdd(e.target.value)} className="w-full p-3 mb-5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none">
                                <option value="">Buscar producto...</option>
                                {productTypes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} — Stock: {getStock(p.id, saleLocation)}</option>
                                ))}
                            </select>

                            <div className="grid grid-cols-12 gap-4 mb-4">
                                <div className="col-span-4">
                                    <label className="text-xs font-bold text-slate-500 block mb-1">CANTIDAD</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-800" placeholder="0"/>
                                </div>
                                
                                {/* Sección de Bonificación con Campos Condicionales */}
                                <div className={`col-span-4 transition-opacity ${currentRule.showBonusFields ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                    <label className="text-xs font-bold text-emerald-600 block mb-1">BONIFICACIÓN</label>
                                    <input type="number" value={bonusQuantity} onChange={e => setBonusQuantity(e.target.value)} className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-emerald-800" placeholder="0"/>
                                </div>
                                <div className={`col-span-4 relative transition-opacity ${currentRule.showBonusFields ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                    <label className="text-xs font-bold text-emerald-600 block mb-1">% DESC.</label>
                                    <div className="relative">
                                        <input type="number" value={bonusDiscount} onChange={e => setBonusDiscount(e.target.value)} className="w-full p-3 pl-3 pr-8 bg-emerald-50 border border-emerald-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-emerald-800" placeholder="100"/>
                                        <FiPercent className="absolute right-3 top-3.5 text-emerald-400" size={14}/>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleAddItem} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-transform active:scale-95">
                                Agregar a la Orden
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: RESUMEN (Sin cambios funcionales aquí, solo visuales) */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex-grow flex flex-col overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2"><FiShoppingCart/> Resumen de Orden</h3>
                                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">{invoiceItems.length} Items</span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-0 min-h-[300px]">
                                {invoiceItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <FiShoppingCart size={48} className="mb-4 opacity-50"/>
                                        <p>El carrito está vacío</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white text-slate-500 sticky top-0 shadow-sm z-10">
                                            <tr><th className="p-4">Producto</th><th className="p-4 text-center">Cant.</th><th className="p-4 text-right">Subtotal</th><th className="p-4"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <AnimatePresence>
                                                {groupedDisplay.map(item => {
                                                    const regularTotal = item.qty * item.price;
                                                    const bonusTotal = (item.price * item.bonus) * (1 - (item.avgDiscount / 100)); 
                                                    const displayTotal = regularTotal + bonusTotal;

                                                    return (
                                                        <motion.tr key={item.productId} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="hover:bg-slate-50">
                                                            <td className="p-4">
                                                                <div className="font-medium text-slate-800">{item.name}</div>
                                                                {item.bonus > 0 && (
                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                                                            <FiCheckCircle size={10}/> {item.bonus} Bonif. ({item.avgDiscount}%)
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-center font-bold text-slate-700">
                                                                {item.qty}
                                                                {item.bonus > 0 && <span className="text-emerald-500 ml-1">+{item.bonus}</span>}
                                                            </td>
                                                            <td className="p-4 text-right font-medium text-slate-600">L {displayTotal.toFixed(2)}</td>
                                                            <td className="p-4 text-center">
                                                                <button onClick={() => setInvoiceItems(invoiceItems.filter(i => i.productId !== item.productId))} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors"><FiTrash2/></button>
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* TOTALES */}
                            <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-2">
                                <div className="flex justify-between text-sm text-slate-500"><span>Subtotal Bruto:</span> <span>L {totals.totalBeforeDiscount.toFixed(2)}</span></div>
                                {totals.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                        <span>Descuento / Bonificación:</span> 
                                        <span>- L {totals.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-slate-500 pt-2 border-t border-slate-200"><span>Subtotal Neto:</span> <span>L {totals.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-slate-500"><span>ISV (15%):</span> <span>L {totals.tax.toFixed(2)}</span></div>
                                
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200">
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