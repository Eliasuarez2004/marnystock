// src/pages/CreateInvoice.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../firebase/clientService';
import { getProducts } from '../firebase/productService';
import { addInvoice, getNextInvoiceNumber } from '../firebase/invoiceService';
import { toast } from 'react-toastify';
import AnimatedPage from '../components/AnimatedPage';

const CreateInvoice = () => {
    const navigate = useNavigate();
    // Data sources
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    
    // Invoice state
    const [selectedClientId, setSelectedClientId] = useState('');
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    
    // UI state
    const [productToAdd, setProductToAdd] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch clients, products, and next invoice number
        getClients(setClients);
        getProducts(setProducts);
        getNextInvoiceNumber().then(setInvoiceNumber);
    }, []);

    const handleAddItem = () => {
        if (!productToAdd || quantity <= 0) return;

        const product = products.find(p => p.id === productToAdd);
        if (!product) return;

        // Check if stock is sufficient
        if (product.stock < quantity) {
            toast.error(`Stock insuficiente. Solo quedan ${product.stock} unidades.`);
            return;
        }

        // Check if item is already in the list
        const existingItem = invoiceItems.find(item => item.productId === product.id);
        if (existingItem) {
            toast.warn("Este producto ya está en la factura. Edítalo desde la lista.");
            return;
        }

        setInvoiceItems([...invoiceItems, {
            productId: product.id,
            name: product.name,
            quantity: Number(quantity),
            price: Number(product.price),
            subtotal: Number(quantity) * Number(product.price)
        }]);

        // Reset fields
        setProductToAdd('');
        setQuantity(1);
    };

    const handleRemoveItem = (productId) => {
        setInvoiceItems(invoiceItems.filter(item => item.productId !== productId));
    };

    const totals = useMemo(() => {
        const subtotal = invoiceItems.reduce((acc, item) => acc + item.subtotal, 0);
        const tax = subtotal * 0.15; // 15% ISV (Honduras)
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }, [invoiceItems]);

    const handleSubmitInvoice = async () => {
        if (!selectedClientId || invoiceItems.length === 0) {
            toast.error("Por favor, selecciona un cliente y añade al menos un producto.");
            return;
        }
        setLoading(true);

        const client = clients.find(c => c.id === selectedClientId);
        
        const invoiceData = {
            invoiceNumber,
            issueDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            status: 'Pendiente',
            clientId: client.id,
            clientName: client.name,
            items: invoiceItems,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total
        };

        try {
            await addInvoice(invoiceData);
            toast.success(`Factura ${invoiceNumber} creada exitosamente!`);
            navigate('/facturas');
        } catch (error) {
            console.error("Error al crear la factura:", error);
            toast.error("Hubo un error al crear la factura.");
        }
        setLoading(false);
    };

    return (
        <AnimatedPage>
        <div>
            <h1 className="text-3xl font-bold text-secondary mb-6">Crear Nueva Factura ({invoiceNumber})</h1>
            
            {/* Client and Product Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="font-bold mb-2">1. Seleccionar Cliente</h2>
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- Elige un cliente --</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="font-bold mb-2">2. Añadir Productos</h2>
                    <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)} className="w-full p-2 border rounded mb-2">
                        <option value="">-- Elige un producto --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                    </select>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="w-full p-2 border rounded mb-2" />
                    <button onClick={handleAddItem} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Añadir a la Factura</button>
                </div>
            </div>

            {/* Invoice Items Table */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h2 className="font-bold mb-4">3. Artículos de la Factura</h2>
                <table className="w-full">
                    <thead><tr className="border-b"><th className="text-left p-2">Producto</th><th className="text-left p-2">Cant.</th><th className="text-left p-2">Precio</th><th className="text-left p-2">Subtotal</th><th></th></tr></thead>
                    <tbody>
                        {invoiceItems.map(item => (
                            <tr key={item.productId}><td className="p-2">{item.name}</td><td className="p-2">{item.quantity}</td><td className="p-2">L {item.price.toFixed(2)}</td><td className="p-2">L {item.subtotal.toFixed(2)}</td><td><button onClick={() => handleRemoveItem(item.productId)} className="text-red-500">X</button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals and Submission */}
            <div className="flex justify-between items-start">
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-bold">Subtotal: <span className="font-normal">L {totals.subtotal.toFixed(2)}</span></h3>
                    <h3 className="font-bold">ISV (15%): <span className="font-normal">L {totals.tax.toFixed(2)}</span></h3>
                    <h2 className="font-bold text-xl mt-2">Total: <span className="font-normal">L {totals.total.toFixed(2)}</span></h2>
                </div>
                <button onClick={handleSubmitInvoice} disabled={loading} className="px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300">
                    {loading ? 'Generando...' : 'Generar Factura'}
                </button>
            </div>
        </div>
        </AnimatedPage>
    );
};

export default CreateInvoice;