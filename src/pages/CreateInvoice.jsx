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
        if (!saleLocation) { toast.error("Por favor, selecciona primero la sede de la venta."); return; }
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

    const handleSubmitInvoice = async () => { /* ... (sin cambios) ... */ };

    return (
        <AnimatedPage>
            {/* ... (todo el JSX se mantiene igual, solo cambia el .map del select de productos) ... */}
        </AnimatedPage>
    );
};

export default CreateInvoice;