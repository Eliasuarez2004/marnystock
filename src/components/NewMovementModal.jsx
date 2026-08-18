// src/components/NewMovementModal.jsx 
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { createInventoryMovement } from '../firebase/inventoryService';
import Select from 'react-select';

const movementTypes = [
    { value: 'TRASLADO', label: 'Traslado entre Sedes', from: true, to: true, isExit: true },
    { value: 'SALIDA_REGALIA', label: 'Salida por Regalía/Bonificación', from: true, to: false, isExit: true },
    { value: 'SALIDA_AJUSTE', label: 'Salida por Ajuste/Pérdida', from: true, to: false, isExit: true },
    { value: 'ENTRADA_DEVOLUCION', label: 'Entrada por Devolución de Cliente', from: false, to: true, isExit: false },
];

const NewMovementModal = ({ isOpen, onClose, lots }) => {
    const [type, setType] = useState('TRASLADO');
    const [selectedLotOption, setSelectedLotOption] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedMovementType = useMemo(() => movementTypes.find(t => t.value === type), [type]);
    const selectedLot = selectedLotOption?.value;

    // --- ¡AQUÍ ESTÁ LA LÓGICA DINÁMICA! ---
    const lotOptions = useMemo(() => {
        let availableLots = lots;
        
        // Si el movimiento es de SALIDA, solo mostramos lotes con stock.
        if (selectedMovementType.isExit) {
            availableLots = lots.filter(l => (l.stockSPS || 0) + (l.stockTGU || 0) > 0);
        }
        
        // Si es de ENTRADA, mostramos TODOS los lotes.
        return availableLots.map(l => ({
            value: l,
            label: `${l.productName} - Lote: ${l.lotNumber} (Vence: ${l.expiryDate})`
        }));
    }, [lots, type]); // Depende de 'lots' y del 'type' de movimiento

    useEffect(() => {
        if (isOpen) {
            setSelectedLotOption(null); setQuantity(1); setFromLocation('');
            setToLocation(''); setReason('');
        }
    }, [isOpen, type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedLotId = selectedLot?.id;
        if (!selectedLotId || quantity <= 0) { toast.error("Selecciona un lote y una cantidad válida."); return; }
        if (selectedMovementType.from && !fromLocation) { toast.error("Debes seleccionar una sede de origen."); return; }
        if (selectedMovementType.to && !toLocation) { toast.error("Debes seleccionar una sede de destino."); return; }
        if (fromLocation && fromLocation === toLocation) { toast.error("Las sedes de origen y destino no pueden ser la misma."); return; }
        if (fromLocation && selectedLot) {
            const stockField = fromLocation === 'SPS' ? 'stockSPS' : 'stockTGU';
            if ((selectedLot[stockField] || 0) < quantity) {
                toast.error(`Stock insuficiente. Solo quedan ${selectedLot[stockField] || 0} unidades.`); return;
            }
        }
        setLoading(true);
        const movementData = { type, lotId: selectedLotId, quantity: Number(quantity), fromLocation: selectedMovementType.from ? fromLocation : null, toLocation: selectedMovementType.to ? toLocation : null, reason };
        try {
            await createInventoryMovement(movementData);
            toast.success('Movimiento de inventario registrado!');
            onClose();
        } catch (error) { toast.error(`Error: ${error.message}`); console.error(error); }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold text-secondary mb-4">Registrar Movimiento de Inventario</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Movimiento</label><select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border rounded">{movementTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lote de Producto Afectado</label>
                        <Select options={lotOptions} value={selectedLotOption} onChange={setSelectedLotOption} placeholder="Buscar por producto o número de lote..." isClearable noOptionsMessage={() => "No se encontraron lotes"}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedMovementType.from && (<div><label className="block text-sm font-bold text-gray-700 mb-1">Origen</label><select value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} required className="w-full p-2 border rounded"><option value="">-- Sede de Origen --</option><option value="SPS">San Pedro Sula (Stock: {selectedLot?.stockSPS || 0})</option><option value="TGU">Tegucigalpa (Stock: {selectedLot?.stockTGU || 0})</option></select></div>)}
                        {selectedMovementType.to && (<div><label className="block text-sm font-bold text-gray-700 mb-1">Destino</label><select value={toLocation} onChange={(e) => setToLocation(e.target.value)} required className="w-full p-2 border rounded"><option value="">-- Sede de Destino --</option><option value="SPS">San Pedro Sula</option><option value="TGU">Tegucigalpa</option></select></div>)}
                    </div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Cantidad</label><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" className="w-full p-2 border rounded"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Razón o Nota (opcional)</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Bonificación a cliente VIP, producto dañado..." className="w-full p-2 border rounded h-20"></textarea></div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">{loading ? 'Procesando...' : 'Registrar Movimiento'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default NewMovementModal;