// src/components/InventoryMovementModal.jsx
// (Este es un componente nuevo, puedes copiar y pegar)
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createInventoryMovement } from '../firebase/inventoryMovementService';

const movementTypes = [
    { value: 'BONIFICACION', label: 'Salida por Bonificación' },
    { value: 'AJUSTE_SALIDA', label: 'Salida por Ajuste/Pérdida' },
    { value: 'TRASLADO', label: 'Traslado entre Sedes' },
];

const InventoryMovementModal = ({ isOpen, onClose, products }) => {
    const [productId, setProductId] = useState('');
    const [type, setType] = useState('BONIFICACION');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // ... validaciones ...
        setLoading(true);
        const selectedProduct = products.find(p => p.id === productId);
        const movementData = { productId, productName: selectedProduct.name, type, fromLocation, toLocation, quantity: Number(quantity), reason };
        try {
            await createInventoryMovement(movementData);
            toast.success('Movimiento de inventario registrado!');
            onClose();
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        }
        setLoading(false);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold text-secondary mb-4">Registrar Movimiento de Inventario</h2>
                <form onSubmit={handleSubmit}>
                    {/* ... campos del formulario para productId, type, fromLocation, etc. ... */}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose}>Cancelar</button>
                        <button type="submit" disabled={loading}>{loading ? 'Procesando...' : 'Registrar Movimiento'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryMovementModal;