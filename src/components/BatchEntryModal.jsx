// src/components/BatchEntryModal.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { addBatchToProduct } from '../firebase/productService';

const BatchEntryModal = ({ isOpen, onClose, products, onBatchAdded }) => {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [quantitySPS, setQuantitySPS] = useState(0);
    const [quantityTGU, setQuantityTGU] = useState(0);
    const [supplier, setSupplier] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProductId || !lotNumber || !expiryDate || !supplier) {
            toast.error('Todos los campos son obligatorios.');
            return;
        }
        if (Number(quantitySPS) <= 0 && Number(quantityTGU) <= 0) {
            toast.error('Debe ingresar una cantidad para al menos una sede.');
            return;
        }
        setLoading(true);

        const batchData = {
            lotNumber,
            expiryDate,
            purchaseDate: new Date().toISOString().split('T')[0],
            quantitySPS: Number(quantitySPS),
            quantityTGU: Number(quantityTGU),
            supplier,
        };

        try {
            await addBatchToProduct(selectedProductId, batchData);
            toast.success('Entrada de inventario registrada exitosamente!');
            onBatchAdded(); // Callback para refrescar datos si es necesario
            onClose(); // Cierra el modal
        } catch (error) {
            toast.error('Error al registrar la entrada.');
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold text-secondary mb-4">Registrar Entrada de Inventario</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">Producto</label>
                        <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required className="w-full p-2 border rounded">
                            <option value="">-- Seleccionar Producto --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Número de Lote" required className="w-full p-2 border rounded"/>
                        <div>
                            <label className="text-xs text-gray-600">Fecha de Vencimiento</label>
                            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="w-full p-2 border rounded"/>
                        </div>
                    </div>
                     <div className="mb-3">
                        <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Proveedor / Laboratorio" required className="w-full p-2 border rounded"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="number" value={quantitySPS} onChange={(e) => setQuantitySPS(e.target.value)} placeholder="Cantidad para SPS" min="0" className="w-full p-2 border rounded"/>
                        <input type="number" value={quantityTGU} onChange={(e) => setQuantityTGU(e.target.value)} placeholder="Cantidad para TGU" min="0" className="w-full p-2 border rounded"/>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-primary rounded hover:bg-red-700 disabled:bg-red-300">
                            {loading ? 'Registrando...' : 'Registrar Entrada'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BatchEntryModal;