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
    const [quantity, setQuantity] = useState(1);
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
        if (!saleLocation) { toast.error("Selecciona primero la sede de la venta."); return; }
        if (!productToAdd || quantity <= 0) { toast.warn("Selecciona un producto y una cantidad válida."); return; }
        
        const product = productTypes.find(p => p.id === productToAdd);
        if (!product) return;

        const existingItem = invoiceItems.find(item => item.productId === product.id);
        const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
        const newTotalQuantity = currentQuantityInCart + Number(quantity);
        const stockAvailable = getStockForLocation(product.id, saleLocation);
        
        if (stockAvailable < newTotalQuantity) {
            toast.error(`Stock insuficiente en ${saleLocation}. Tienes ${currentQuantityInCart} en el carrito y solo quedan ${stockAvailable} en total.`);
            return;
        }

        if (existingItem) {
            setInvoiceItems(invoiceItems.map(item => item.productId === product.id ? { ...item, quantity: newTotalQuantity, subtotal: newTotalQuantity * item.price } : item));
            toast.info(`Cantidad de "${product.name}" actualizada a ${newTotalQuantity}.`);
        } else {
            setInvoiceItems([...invoiceItems, { productId: product.id, name: product.name, quantity: Number(quantity), price: Number(product.price), subtotal: Number(quantity) * Number(product.price) }]);
        }
        
        setProductToAdd('');
        setQuantity(1);
    };

    const handleRemoveItem = (productId) => {
        setInvoiceItems(invoiceItems.filter(item => item.productId !== productId));
    };

    const handleClearInvoice = () => {
        setInvoiceItems([]); setSelectedClientId(''); setSaleLocation('');
    };

    const totals = useMemo(() => {
        const subtotal = invoiceItems.reduce((acc, item) => acc + item.subtotal, 0);
        const tax = subtotal * 0.15;
        const total = subtotal + tax;
        return { subtotal, tax, total };
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
            items: invoiceItems,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total
        };

        try {
            await addInvoiceAndProcessStock(invoiceData, saleLocation);
            toast.success(`Factura ${invoiceNumber} generada y stock actualizado!`);
            navigate('/facturas');
        } catch (error) { toast.error(`Error: ${error.message}`); console.error(error); }
        setLoading(false);
    };

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
                        <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)} className="w-full p-2 border rounded mb-2" disabled={!saleLocation}>
                            <option value="">-- Elige un producto --</option>
                            {productTypes.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Stock: {getStockForLocation(p.id, saleLocation)})
                                </option>
                            ))}
                        </select>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value < 1 ? 1 : e.target.value)} min="1" className="w-full p-2 border rounded mb-2" />
                        <button type="button" onClick={handleAddItem} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">Añadir a la Factura</button>
                    </div>
                </div>
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold border-b pb-2 mb-4">Resumen</h2>
                    <div className="overflow-y-auto min-h-[200px] max-h-[400px]">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white"><tr className="border-b"><th className="text-left p-2">Producto</th><th className="text-center p-2">Cant.</th><th className="text-right p-2">Subtotal</th><th></th></tr></thead>
                            <tbody>
                                <AnimatePresence>
                                    {invoiceItems.map(item => (
                                        <motion.tr key={item.productId} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="border-b">
                                            <td className="p-2">{item.name}<br/><small className="text-gray-500">L {item.price.toFixed(2)} c/u</small></td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            <td className="p-2 text-right font-semibold">L {item.subtotal.toFixed(2)}</td>
                                            <td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700"><FiTrash2 /></button></td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {!isInvoiceStarted && <p className="text-center text-gray-400 p-8">Añade productos para verlos aquí.</p>}
                    </div>
                    {isInvoiceStarted && (
                        <div className="mt-6 pt-4 border-t-2 border-dashed">
                            <div className="flex justify-between text-lg"><p>Subtotal:</p><p>L {totals.subtotal.toFixed(2)}</p></div>
                            <div className="flex justify-between text-lg"><p>ISV (15%):</p><p>L {totals.tax.toFixed(2)}</p></div>
                            <div className="flex justify-between text-2xl font-bold mt-2 text-primary"><p>Total:</p><p>L {totals.total.toFixed(2)}</p></div>
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