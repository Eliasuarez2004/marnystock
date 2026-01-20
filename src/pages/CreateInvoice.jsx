import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClients } from '../firebase/clientService';
import { getProductTypesStream } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';
import { FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTE PARA LA FILA DE LA FACTURA ---
const InvoiceItemRow = ({ item, onRemove }) => {
    const saleItem = item.lines.find(line => !line.isBonus);
    const bonusItem = item.lines.find(line => line.isBonus);

    const displayQuantity = () => {
        if (saleItem && bonusItem) {
            return `${saleItem.quantity} + ${bonusItem.quantity}`;
        }
        if (saleItem) return saleItem.quantity;
        if (bonusItem) return bonusItem.quantity;
        return 0;
    };
    
    const totalPrice = saleItem ? saleItem.price * saleItem.quantity : 0;

    return (
        <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 50 }} className="border-b">
            <td className="p-2">
                {item.name}
                {bonusItem && <span className="ml-2 text-xs text-white bg-green-500 px-1.5 py-0.5 rounded-full font-semibold">BONUS</span>}
            </td>
            <td className="p-2 text-center">{displayQuantity()}</td>
            <td className="p-2 text-right">{saleItem ? `L ${saleItem.price.toFixed(2)}` : 'L 0.00'}</td>
            <td className="p-2 text-right font-semibold">{`L ${totalPrice.toFixed(2)}`}</td>
            <td className="p-2 text-center">
                <button type="button" onClick={() => onRemove(item.productId)} className="text-red-500 hover:text-red-700"><FiTrash2 /></button>
            </td>
        </motion.tr>
    );
};


const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [inventoryLots, setInventoryLots] = useState([]);
    
    const [selectedClientId, setSelectedClientId] = useState('');
    const [saleLocation, setSaleLocation] = useState('');
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    
    const [productToAdd, setProductToAdd] = useState('');
    const [quantity, setQuantity] = useState('');
    const [bonusQuantity, setBonusQuantity] = useState('');
    
    const [loading, setLoading] = useState(false);
    const isInvoiceStarted = invoiceItems.length > 0;

    useEffect(() => {
        const unsubClients = getClients(setClients);
        const unsubProductTypes = getProductTypesStream(setProductTypes);
        const unsubInventoryLots = getInventoryLotsStream(setInventoryLots);
        
        getNextInvoiceNumber().then(setInvoiceNumber);

        return () => {
            unsubClients();
            unsubProductTypes();
            unsubInventoryLots();
        };
    }, []);

    const getStockForLocation = (productId, location) => {
        if (!productId || !location) return 0;
        const relevantLots = inventoryLots.filter(lot => lot.productId === productId);
        const stockField = location === 'SPS' ? 'stockSPS' : 'stockTGU';
        return relevantLots.reduce((acc, lot) => acc + (lot[stockField] || 0), 0);
    };

    const handleAddItem = () => {
        if (!saleLocation) { toast.error("Selecciona la sede de la venta."); return; }
        if (!productToAdd) { toast.warn("Selecciona un producto."); return; }

        const saleQty = Number(quantity) || 0;
        const bonusQty = Number(bonusQuantity) || 0;

        if (saleQty <= 0 && bonusQty <= 0) {
            toast.warn("Ingresa una cantidad de venta o de bonificación.");
            return;
        }

        const product = productTypes.find(p => p.id === productToAdd);
        if (!product) return;

        const totalQtyNeeded = saleQty + bonusQty;
        const stockAvailable = getStockForLocation(product.id, saleLocation);
        const quantityInCart = invoiceItems.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
        
        if (stockAvailable < (quantityInCart + totalQtyNeeded)) {
            toast.error(`Stock insuficiente. Ya tienes ${quantityInCart} en el carrito y solo quedan ${stockAvailable} en total.`);
            return;
        }

        const newItems = [];
        if (saleQty > 0) {
            newItems.push({ 
                itemId: `${product.id}-sale-${Date.now()}`,
                productId: product.id, name: product.name, 
                quantity: saleQty, price: Number(product.price), 
                isBonus: false
            });
        }
        if (bonusQty > 0) {
            newItems.push({ 
                itemId: `${product.id}-bonus-${Date.now()}`,
                productId: product.id, name: product.name, 
                quantity: bonusQty, price: Number(product.price), 
                isBonus: true
            });
        }

        setInvoiceItems(prevItems => [...prevItems, ...newItems]);
        
        setProductToAdd('');
        setQuantity('');
        setBonusQuantity('');
    };

    const handleRemoveItem = (productIdToRemove) => {
        setInvoiceItems(invoiceItems.filter(item => item.productId !== productIdToRemove));
    };

    const handleClearInvoice = () => {
        setInvoiceItems([]); setSelectedClientId(''); setSaleLocation('');
    };

    const totals = useMemo(() => {
        const grossTotal = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const discountAmount = invoiceItems
            .filter(item => item.isBonus)
            .reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const subtotal = grossTotal - discountAmount;
        const tax = subtotal * 0.15;
        const total = subtotal + tax;
        return { totalBeforeDiscount: grossTotal, discountAmount, subtotal, tax, total };
    }, [invoiceItems]);

    const handleSubmitInvoice = async (e) => {
        e.preventDefault();
        if (!selectedClientId || !saleLocation || invoiceItems.length === 0) { toast.error("Completa Cliente, Sede y al menos un producto."); return; }
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        
        const invoiceData = {
            invoiceNumber,
            issueDate: new Date().toISOString().split('T')[0],
            status: 'Pendiente',
            clientId: client.id,
            clientName: client.name,
            saleLocation,
            items: invoiceItems.map(({itemId, ...item}) => item),
            totalBeforeDiscount: totals.totalBeforeDiscount,
            discountAmount: totals.discountAmount,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total
        };

        try {
            await addInvoiceAndProcessStock(invoiceData, saleLocation);
            toast.success(`Factura ${invoiceNumber} generada!`);
            navigate('/facturas');
        } catch (error) { toast.error(`Error: ${error.message}`); console.error(error); }
        setLoading(false);
    };

    const groupedInvoiceItems = useMemo(() => {
        const grouped = {};
        invoiceItems.forEach(item => {
            if (!grouped[item.productId]) {
                grouped[item.productId] = {
                    productId: item.productId,
                    name: item.name,
                    lines: []
                };
            }
            grouped[item.productId].lines.push(item);
        });
        return Object.values(grouped);
    }, [invoiceItems]);

    return (
        <AnimatedPage>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary">Crear Nueva Factura ({invoiceNumber})</h1>
                {isInvoiceStarted && (
                    <button onClick={handleClearInvoice} className="px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors">
                        Limpiar Factura
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Cliente</label>
                        <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full p-2 border rounded disabled:bg-gray-200 disabled:cursor-not-allowed" disabled={isInvoiceStarted}>
                            <option value="">-- Elige un cliente --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Sede de Venta</label>
                        <select value={saleLocation} onChange={(e) => setSaleLocation(e.target.value)} className="w-full p-2 border rounded disabled:bg-gray-200 disabled:cursor-not-allowed" disabled={isInvoiceStarted}>
                            <option value="">-- Elige una sede --</option>
                            <option value="SPS">San Pedro Sula</option>
                            <option value="TGU">Tegucigalpa</option>
                        </select>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <label className="block text-sm font-bold text-gray-700 mb-2">3. Añadir Productos</label>
                        <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)} className="w-full p-2 border rounded mb-3" disabled={!saleLocation}>
                            <option value="">-- Elige un producto --</option>
                            {productTypes.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Stock: {getStockForLocation(p.id, saleLocation)})
                                </option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="quantity" className="block text-xs font-medium text-gray-600">Cant. (Venta)</label>
                                <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" className="w-full p-2 border rounded" placeholder="Ej: 12"/>
                            </div>
                            <div>
                                <label htmlFor="bonusQuantity" className="block text-xs font-medium text-gray-600">Cant. (Bonificación)</label>
                                <input id="bonusQuantity" type="number" value={bonusQuantity} onChange={(e) => setBonusQuantity(e.target.value)} min="0" className="w-full p-2 border rounded" placeholder="Ej: 1"/>
                            </div>
                        </div>
                        <button type="button" onClick={handleAddItem} className="w-full mt-3 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">Añadir a la Factura</button>
                    </div>
                </div>
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold border-b pb-2 mb-4">Resumen</h2>
                    <div className="overflow-y-auto min-h-[200px] max-h-[400px]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white"><tr className="border-b">
                                <th className="p-2 text-left">Producto</th>
                                <th className="p-2 text-center">Cant. (+Bonus)</th>
                                <th className="p-2 text-right">Precio</th>
                                <th className="p-2 text-right">Total</th>
                                <th></th>
                            </tr></thead>
                            <tbody>
                                <AnimatePresence>
                                    {groupedInvoiceItems.map(item => (
                                        <InvoiceItemRow key={item.productId} item={item} onRemove={handleRemoveItem} />
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {!isInvoiceStarted && <p className="text-center text-gray-400 p-8">Añade productos para verlos aquí.</p>}
                    </div>
                    {isInvoiceStarted && (
                        <div className="mt-6 pt-4 border-t-2 border-dashed text-right space-y-1 text-base">
                            <div className="flex justify-between"><p className="text-gray-600">Total Bruto:</p><p className="font-semibold">L {totals.totalBeforeDiscount.toFixed(2)}</p></div>
                            <div className="flex justify-between text-red-500"><p>Descuento (Bonificación):</p><p className="font-semibold">- L {totals.discountAmount.toFixed(2)}</p></div>
                            <div className="flex justify-between border-t mt-1 pt-1"><p className="text-gray-600">Sub-Total:</p><p className="font-semibold">L {totals.subtotal.toFixed(2)}</p></div>
                            <div className="flex justify-between"><p className="text-gray-600">ISV (15%):</p><p className="font-semibold">L {totals.tax.toFixed(2)}</p></div>
                            <div className="flex justify-between text-2xl font-bold mt-2 text-primary"><p>Total a Pagar:</p><p>L {totals.total.toFixed(2)}</p></div>
                            <button onClick={handleSubmitInvoice} disabled={loading} className="w-full mt-6 px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300">
                                {loading ? 'Generando...' : 'Generar Factura'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AnimatedPage>
    );
};

export default CreateInvoice;