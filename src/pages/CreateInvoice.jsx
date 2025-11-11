// src/pages/CreateInvoice.jsx (REDiseñado para FEFO y Sedes)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClients } from '../firebase/clientService';
import { getProductsWithBatches } from '../firebase/productService';
import { addInvoiceAndProcessStock, getNextInvoiceNumber } from '../firebase/invoiceService';
import AnimatedPage from '../components/AnimatedPage';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    
    // --- Estado de la Factura ---
    const [selectedClientId, setSelectedClientId] = useState('');
    const [saleLocation, setSaleLocation] = useState(''); // ¡NUEVO! SPS o TGU
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    
    // --- Estado de la UI ---
    const [productToAdd, setProductToAdd] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getClients(setClients);
        getProductsWithBatches(setProducts);
        getNextInvoiceNumber().then(setInvoiceNumber);
    }, []);

    const getStockForLocation = (product, location) => {
        if (!product.batches || !location) return 0;
        const stockField = location === 'SPS' ? 'quantitySPS' : 'quantityTGU';
        return product.batches.reduce((acc, batch) => acc + (batch[stockField] || 0), 0);
    };

    const handleAddItem = () => {
        if (!saleLocation) {
            toast.error("Por favor, selecciona primero la sede de la venta.");
            return;
        }
        if (!productToAdd || quantity <= 0) return;

        const product = products.find(p => p.id === productToAdd);
        if (!product) return;

        const stockAvailable = getStockForLocation(product, saleLocation);
        if (stockAvailable < quantity) {
            toast.error(`Stock insuficiente en ${saleLocation}. Solo quedan ${stockAvailable} unidades.`);
            return;
        }

        // ... (resto de la lógica para añadir item no cambia)
        const existingItem = invoiceItems.find(item => item.productId === product.id);
        if (existingItem) { toast.warn("Este producto ya está en la factura."); return; }
        setInvoiceItems([...invoiceItems, { productId: product.id, name: product.name, quantity: Number(quantity), price: Number(product.price), subtotal: Number(quantity) * Number(product.price) }]);
        setProductToAdd('');
        setQuantity(1);
    };

    const handleRemoveItem = (productId) => { /* ... sin cambios ... */ };
    const totals = useMemo(() => { /* ... sin cambios ... */ }, [invoiceItems]);

    const handleSubmitInvoice = async () => {
        if (!selectedClientId || invoiceItems.length === 0 || !saleLocation) {
            toast.error("Completa todos los campos: Cliente, Sede y al menos un producto.");
            return;
        }
        setLoading(true);
        const client = clients.find(c => c.id === selectedClientId);
        
        const invoiceData = {
            invoiceNumber,
            issueDate: new Date().toISOString().split('T')[0],
            status: 'Pendiente',
            clientId: client.id,
            clientName: client.name,
            saleLocation, // Guardamos la sede en la factura
            items: invoiceItems,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total
        };

        try {
            await addInvoiceAndProcessStock(invoiceData, saleLocation);
            toast.success(`Factura ${invoiceNumber} generada y stock actualizado!`);
            navigate('/facturas');
        } catch (error) {
            console.error("Error al crear la factura:", error);
            toast.error(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    return (
        <AnimatedPage>
            <div>
                <h1 className="text-3xl font-bold text-secondary mb-6">Crear Nueva Factura ({invoiceNumber})</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Cliente */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="font-bold mb-2">1. Cliente</h2>
                        <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">-- Elige un cliente --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {/* Sede de Venta */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="font-bold mb-2">2. Sede de Venta</h2>
                        <select value={saleLocation} onChange={(e) => setSaleLocation(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">-- Elige una sede --</option>
                            <option value="SPS">San Pedro Sula</option>
                            <option value="TGU">Tegucigalpa</option>
                        </select>
                    </div>
                    {/* Añadir Productos */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="font-bold mb-2">3. Añadir Productos</h2>
                        <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)} className="w-full p-2 border rounded mb-2" disabled={!saleLocation}>
                            <option value="">-- Elige un producto --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {getStockForLocation(p, saleLocation)})</option>)}
                        </select>
                        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="w-full p-2 border rounded mb-2" />
                        <button onClick={handleAddItem} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Añadir a la Factura</button>
                    </div>
                </div>
                {/* ... (resto del JSX de la tabla de items y totales no cambia) ... */}
            </div>
        </AnimatedPage>
    );
};

export default CreateInvoice;