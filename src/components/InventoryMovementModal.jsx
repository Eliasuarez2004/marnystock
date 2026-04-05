import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select'; // Importante tener instalado react-select
// Usamos el servicio unificado que configuramos previamente
import { createInventoryMovement } from '../firebase/inventoryService'; 
import { FiX, FiMove, FiAlertTriangle, FiArrowRight, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MOVEMENT_TYPES = [
    { value: 'TRASLADO', label: 'Traslado entre Sedes', icon: '↔️' },
    { value: 'SALIDA_REGALIA', label: 'Salida por Regalía/Bonificación', icon: '🎁' },
    { value: 'SALIDA_AJUSTE', label: 'Salida por Ajuste/Pérdida', icon: '📉' },
    { value: 'ENTRADA_DEVOLUCION', label: 'Entrada por Devolución de Cliente', icon: '↩️' },
];

const InventoryMovementModal = ({ isOpen, onClose, products }) => {
    const [selectedProductOption, setSelectedProductOption] = useState(null);
    const [type, setType] = useState('TRASLADO');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    // Preparar opciones del buscador con info de stock
    const productOptions = useMemo(() => {
        return products.map(p => ({
            value: p.id,
            label: p.name,
            stockSPS: p.batches?.reduce((acc, b) => acc + (b.stockSPS || 0), 0) || 0,
            stockTGU: p.batches?.reduce((acc, b) => acc + (b.stockTGU || 0), 0) || 0,
        }));
    }, [products]);

    // Calcular stock disponible según la sede de origen seleccionada
    const availableStock = useMemo(() => {
        if (!selectedProductOption || !fromLocation) return 0;
        return fromLocation === 'SPS' ? selectedProductOption.stockSPS : selectedProductOption.stockTGU;
    }, [selectedProductOption, fromLocation]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedProductOption || !quantity || !type) {
            return toast.error("Por favor completa los campos obligatorios.");
        }

        const qty = Number(quantity);
        if (qty <= 0) return toast.error("La cantidad debe ser mayor a 0.");

        // Validar stock si es una salida o traslado
        if (type !== 'ENTRADA_DEVOLUCION' && qty > availableStock) {
            return toast.error(`Stock insuficiente. Solo hay ${availableStock} unidades en ${fromLocation}.`);
        }

        setLoading(true);
        try {
            await createInventoryMovement({
                productId: selectedProductOption.value,
                productName: selectedProductOption.label,
                type,
                fromLocation: type === 'ENTRADA_DEVOLUCION' ? null : fromLocation,
                toLocation: type === 'SALIDA_REGALIA' || type === 'SALIDA_AJUSTE' ? null : toLocation,
                quantity: qty,
                reason: reason || `Movimiento manual de ${type}`
            });
            
            toast.success('Movimiento registrado exitosamente');
            handleClose();
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const handleClose = () => {
        setSelectedProductOption(null);
        setFromLocation('');
        setToLocation('');
        setQuantity('');
        setReason('');
        onClose();
    };

    if (!isOpen) return null;

    const customSelectStyles = {
        control: (base) => ({
            ...base,
            borderRadius: '1rem',
            padding: '0.3rem',
            border: '2px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            '&:hover': { border: '2px solid #3b82f6' }
        })
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <FiMove size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Movimiento de Stock</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors text-slate-400">
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {/* Tipo de Movimiento */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tipo de Operación</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MOVEMENT_TYPES.map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setType(m.value)}
                                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                                        type === m.value 
                                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                    }`}
                                >
                                    <span>{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Buscador de Producto */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Producto a Afectar</label>
                        <Select
                            options={productOptions}
                            value={selectedProductOption}
                            onChange={setSelectedProductOption}
                            placeholder="Escribe el nombre del producto..."
                            styles={customSelectStyles}
                        />
                    </div>

                    {/* Origen y Destino Dinámicos */}
                    <div className="grid grid-cols-2 gap-4">
                        {type !== 'ENTRADA_DEVOLUCION' && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block text-rose-500">Sede Origen</label>
                                <select 
                                    value={fromLocation} 
                                    onChange={(e) => setFromLocation(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-400 font-bold text-slate-700"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="SPS">San Pedro Sula</option>
                                    <option value="TGU">Tegucigalpa</option>
                                </select>
                            </div>
                        )}

                        {type === 'TRASLADO' || type === 'ENTRADA_DEVOLUCION' ? (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block text-emerald-500">Sede Destino</label>
                                <select 
                                    value={toLocation} 
                                    onChange={(e) => setToLocation(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-slate-700"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="SPS">San Pedro Sula</option>
                                    <option value="TGU">Tegucigalpa</option>
                                </select>
                            </div>
                        ) : null}
                    </div>

                    {/* Info de Stock Actual (Visual Only) */}
                    <AnimatePresence>
                        {selectedProductOption && fromLocation && type !== 'ENTRADA_DEVOLUCION' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center gap-3 text-amber-700"
                            >
                                <FiInfo size={20} className="flex-shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-tight">
                                    Stock disponible en {fromLocation}: <span className="text-lg">{availableStock}</span> unidades
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cantidad y Razón */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Cantidad</label>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => setQuantity(e.target.value)} 
                                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-black text-xl text-center"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Razón o Nota</label>
                            <input 
                                type="text" 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium"
                                placeholder="Ej: Daño de transporte"
                            />
                        </div>
                    </div>

                    {/* Botón de Acción */}
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {loading ? 'Procesando...' : <><FiCheckCircle size={20}/> Ejecutar Movimiento</>}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default InventoryMovementModal;