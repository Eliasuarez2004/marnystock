// src/components/BatchEntryModal.jsx (CON ETIQUETAS AÑADIDAS)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { addMultiProductBatchEntry } from '../firebase/productService';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const BatchEntryModal = ({ isOpen, onClose, products }) => {
    const [lotNumber, setLotNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [supplier, setSupplier] = useState('');
    const [entryItems, setEntryItems] = useState([]);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantitySPS, setQuantitySPS] = useState(0);
    const [quantityTGU, setQuantityTGU] = useState(0);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLotNumber('');
            setExpiryDate('');
            setSupplier('');
            setEntryItems([]);
            setSelectedProductId('');
            setQuantitySPS(0);
            setQuantityTGU(0);
        }
    }, [isOpen]);

    const handleAddItem = () => {
        if (!selectedProductId) {
            toast.warn('Debes seleccionar un producto.');
            return;
        }
        if (Number(quantitySPS) <= 0 && Number(quantityTGU) <= 0) {
            toast.warn('Debes ingresar una cantidad para al menos una sede.');
            return;
        }
        if (entryItems.some(item => item.productId === selectedProductId)) {
            toast.warn('Este producto ya está en la lista de entrada.');
            return;
        }
        const product = products.find(p => p.id === selectedProductId);
        setEntryItems([...entryItems, { 
            productId: product.id, 
            name: product.name, 
            quantitySPS: Number(quantitySPS), 
            quantityTGU: Number(quantityTGU) 
        }]);
        
        setSelectedProductId('');
        setQuantitySPS(0);
        setQuantityTGU(0);
    };

    const handleRemoveItem = (productId) => {
        setEntryItems(entryItems.filter(item => item.productId !== productId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!lotNumber || !expiryDate || !supplier || entryItems.length === 0) {
            toast.error('Completa los datos del lote y añade al menos un producto.');
            return;
        }
        setLoading(true);
        const entryData = { lotNumber, expiryDate, supplier, items: entryItems };
        try {
            await addMultiProductBatchEntry(entryData);
            toast.success('Entrada de inventario registrada exitosamente!');
            onClose();
        } catch (error) {
            toast.error('Error al registrar la entrada.');
            console.error(error);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl">
                <h2 className="text-2xl font-bold text-secondary mb-4">Registrar Entrada de Lote (Multi-producto)</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Datos Comunes del Lote */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Número de Lote/Pedido</label>
                            <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Ej: P-12345" required className="w-full p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor/Laboratorio</label>
                            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ej: Marnys" required className="w-full p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Vencimiento</label>
                            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="w-full p-2 border rounded"/>
                        </div>
                    </div>

                    {/* Añadir Productos al Lote */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2 text-gray-800">Añadir Productos a la Entrada</h3>
                        <div className="grid grid-cols-12 gap-x-2 gap-y-4 items-end">
                            {/* --- CAMBIOS AQUÍ --- */}
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
                                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="">-- Seleccionar --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cant. SPS</label>
                                <input type="number" value={quantitySPS} onChange={(e) => setQuantitySPS(e.target.value)} min="0" className="w-full p-2 border rounded text-center"/>
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cant. TGU</label>
                                <input type="number" value={quantityTGU} onChange={(e) => setQuantityTGU(e.target.value)} min="0" className="w-full p-2 border rounded text-center"/>
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <button type="button" onClick={handleAddItem} className="w-full bg-blue-500 text-white rounded p-2 flex items-center justify-center hover:bg-blue-600 transition-colors">
                                    <FiPlus className="mr-2"/> Añadir
                                </button>
                            </div>
                             {/* --- FIN DE LOS CAMBIOS --- */}
                        </div>
                    </div>

                    {/* Tabla de Productos Añadidos */}
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 z-10">
                                <tr>
                                    <th className="p-2 text-left">Producto</th>
                                    <th className="p-2 text-center">Cant. SPS</th>
                                    <th className="p-2 text-center">Cant. TGU</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {entryItems.length > 0 ? entryItems.map(item => (
                                        <motion.tr 
                                            key={item.productId}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b"
                                        >
                                            <td className="p-2 font-semibold">{item.name}</td>
                                            <td className="p-2 text-center">{item.quantitySPS}</td>
                                            <td className="p-2 text-center">{item.quantityTGU}</td>
                                            <td className="p-2 text-center">
                                                <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700"><FiTrash2/></button>
                                            </td>
                                        </motion.tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center text-gray-400 p-6">Añade productos para verlos aquí.</td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-4 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-green-400">
                            {loading ? 'Registrando...' : 'Registrar Entrada Completa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BatchEntryModal;