// src/pages/Inventory.jsx (VERSIÓN FINAL CON IMPORTACIONES CORRECTAS)
import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryLotsStream, getLotHistoryStream, createInventoryMovement, updateLotInfo } from '../firebase/inventoryService';
import { getProductTypesStream } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage';
import { FiPlus, FiClock, FiMove, FiEdit, FiTrash2 } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { parseDateStringAsLocal } from '../utils/dateUtils';

// --- ¡AHORA IMPORTAMOS LOS MODALES DESDE SUS ARCHIVOS! ---
import NewEntryModal from '../components/NewEntryModal';
import NewMovementModal from '../components/NewMovementModal';

// --- MODAL DE HISTORIAL (Definido aquí para simplicidad) ---
const LotHistoryModal = ({ isOpen, onClose, lot }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && lot?.id) {
            setLoading(true);
            const unsubscribe = getLotHistoryStream(lot.id, (movements) => {
                setHistory(movements);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [isOpen, lot]);

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4">Historial del Lote: <span className="text-primary">{lot?.lotNumber}</span></h2>
                <div className="overflow-y-auto flex-grow">
                    {loading ? <p>Cargando historial...</p> : history.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0"><tr>
                                <th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-center">Cantidad</th>
                                <th className="p-2 text-left">Desde</th><th className="p-2 text-left">Hacia</th><th className="p-2 text-left">Razón</th>
                            </tr></thead>
                            <tbody>{history.map(m => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-2">{format(new Date(m.date), 'dd/MM/yyyy HH:mm')}</td><td className="p-2 font-semibold">{m.type}</td><td className="p-2 text-center">{m.quantity}</td>
                                    <td className="p-2">{m.fromLocation || '-'}</td><td className="p-2">{m.toLocation || '-'}</td>
                                    <td className="p-2 text-gray-500">{m.reason}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : <p className="text-center text-gray-500 p-4">No hay movimientos registrados para este lote.</p>}
                </div>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-md self-end hover:bg-gray-300">Cerrar</button>
            </motion.div>
        </div>
    );
};

// --- MODAL PARA EDITAR LOTE (Definido aquí para simplicidad) ---
const EditLotModal = ({ isOpen, onClose, lot }) => {
    const [lotData, setLotData] = useState({ lotNumber: '', expiryDate: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lot) { setLotData({ lotNumber: lot.lotNumber, expiryDate: lot.expiryDate }); }
    }, [lot]);

    const handleChange = (e) => { setLotData({ ...lotData, [e.target.name]: e.target.value }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateLotInfo(lot.id, lotData);
            toast.success("Información del lote actualizada.");
            onClose();
        } catch (error) { toast.error("No se pudo actualizar el lote."); }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"><motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Editar Lote <span className="text-primary">{lot?.lotNumber}</span></h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Número de Lote</label><input type="text" name="lotNumber" value={lotData.lotNumber} onChange={handleChange} required className="w-full p-2 border rounded"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Vencimiento</label><input type="date" name="expiryDate" value={lotData.expiryDate} onChange={handleChange} required className="w-full p-2 border rounded"/></div>
                <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancelar</button><button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">{loading ? 'Guardando...' : 'Guardar Cambios'}</button></div>
            </form>
        </motion.div></div>
    );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE INVENTARIO ---
const Inventory = () => {
    const [lots, setLots] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditLotModalOpen, setIsEditLotModalOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState(null);

    useEffect(() => {
        const unsubscribeLots = getInventoryLotsStream((fetchedLots) => {
            setLots(fetchedLots);
            setLoading(false);
        });
        const unsubscribeProductTypes = getProductTypesStream(setProductTypes);
        return () => { unsubscribeLots(); unsubscribeProductTypes(); };
    }, []);

    const filteredLots = lots.filter(lot =>
        (lot.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lot.lotNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const openHistoryModal = (lot) => { setSelectedLot(lot); setIsHistoryModalOpen(true); };
    const openEditLotModal = (lot) => { setSelectedLot(lot); setIsEditLotModalOpen(true); };

    const handleDeleteLot = async (lot) => {
        const totalStock = (lot.stockSPS || 0) + (lot.stockTGU || 0);
        Swal.fire({
            title: `Eliminar Lote ${lot.lotNumber}?`,
            text: `Esto registrará un movimiento de salida por ajuste con la cantidad total restante (${totalStock} unidades). Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar lote!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (lot.stockSPS > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'SPS', quantity: lot.stockSPS, reason: 'Lote eliminado por completo.' });
                    if (lot.stockTGU > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'TGU', quantity: lot.stockTGU, reason: 'Lote eliminado por completo.' });
                    toast.success(`Lote ${lot.lotNumber} eliminado y ajustado en inventario.`);
                } catch (error) { toast.error(`Error al eliminar el lote: ${error.message}`); }
            }
        });
    };
    
    const getStatus = (expiryDateStr) => {
        const expiryDate = parseDateStringAsLocal(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = differenceInDays(expiryDate, today);

        if (days < 0) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
        if (days <= 90) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Próximo a Vencer</span>;
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Óptimo</span>;
    };

    return (
        <AnimatedPage>
            <div>
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-secondary">Gestión de Inventario por Lote</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setIsMovementModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"><FiMove/> Registrar Movimiento</button>
                        <button onClick={() => setIsEntryModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"><FiPlus/> Nueva Entrada (Compra)</button>
                    </div>
                </div>
                
                <input type="text" placeholder="Buscar por Producto o # de Lote..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md mb-4" />
                
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                        <thead className="text-left bg-gray-100">
                            <tr>
                                <th className="p-3">Producto</th><th className="p-3"># Lote</th><th className="p-3">Vencimiento</th>
                                <th className="p-3 text-center">Stock SPS</th><th className="p-3 text-center">Stock TGU</th>
                                <th className="p-3 text-center font-bold">Stock Total</th><th className="p-3">Estado</th><th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? ( <tr><td colSpan="8" className="text-center p-6 text-gray-500">Cargando inventario...</td></tr> ) : 
                            filteredLots.length > 0 ? (
                                filteredLots.map(lot => {
                                    const totalStock = (lot.stockSPS || 0) + (lot.stockTGU || 0);
                                    return (
                                    <tr key={lot.id} className={`border-b hover:bg-gray-50 transition-opacity ${totalStock === 0 ? 'opacity-40' : ''}`}>
                                        <td className="p-3 font-semibold text-text-dark">{lot.productName}</td>
                                        <td className="p-3 font-mono text-gray-600">{lot.lotNumber}</td>
                                        <td className="p-3">{format(parseDateStringAsLocal(lot.expiryDate), 'dd/MM/yyyy')}</td>
                                        <td className="p-3 text-center">{lot.stockSPS || 0}</td>
                                        <td className="p-3 text-center">{lot.stockTGU || 0}</td>
                                        <td className="p-3 text-center font-bold text-primary">{totalStock}</td>
                                        <td className="p-3 text-center">{getStatus(lot.expiryDate)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => openHistoryModal(lot)} title="Ver Historial" className="text-blue-600 hover:text-blue-800"><FiClock size={16}/></button>
                                                <button onClick={() => openEditLotModal(lot)} title="Editar Lote" className="text-green-600 hover:text-green-800"><FiEdit size={16}/></button>
                                                <button onClick={() => handleDeleteLot(lot)} title="Eliminar Lote" disabled={totalStock === 0} className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"><FiTrash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr><td colSpan="8" className="text-center p-6 text-gray-500">No se encontraron lotes. Prueba crear una nueva entrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <NewEntryModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} productTypes={productTypes} />
                <NewMovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} lots={lots} />
                {selectedLot && <LotHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} lot={selectedLot} />}
                {selectedLot && <EditLotModal isOpen={isEditLotModalOpen} onClose={() => setIsEditLotModalOpen(false)} lot={selectedLot} />}
            </div>
        </AnimatedPage>
    );
};

export default Inventory;