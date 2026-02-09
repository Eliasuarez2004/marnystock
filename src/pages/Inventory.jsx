import React, { useState, useEffect } from 'react';
import { getInventoryLotsStream, getLotHistoryStream, createInventoryMovement, updateLotInfo } from '../firebase/inventoryService';
import { getProductTypesStream } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage';
import { FiPlus, FiClock, FiMove, FiEdit, FiTrash2, FiSearch, FiPackage } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import NewEntryModal from '../components/NewEntryModal';
import NewMovementModal from '../components/NewMovementModal';

// --- Modales Auxiliares (Simplificados para diseño) ---
// (Misma lógica de modales que tenías, solo envuelta en UI moderna si la tienes en componentes separados mejor, 
//  aquí mantengo la estructura interna pero con estilos actualizados si copiaste el bloque completo)
// ... [Asumo que los modales LotHistoryModal y EditLotModal están dentro o importados, usaré la lógica existente]

const LotHistoryModal = ({ isOpen, onClose, lot }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && lot?.id) {
            setLoading(true);
            const unsubscribe = getLotHistoryStream(lot.id, (movements) => { setHistory(movements); setLoading(false); });
            return () => unsubscribe();
        }
    }, [isOpen, lot]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Historial: <span className="text-blue-600">{lot?.lotNumber}</span></h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="overflow-y-auto flex-grow custom-scrollbar">
                    {loading ? <p className="text-center py-4">Cargando...</p> : history.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0"><tr><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3 text-center">Cant.</th><th className="p-3">Razón</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{history.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 text-slate-600">{format(new Date(m.date), 'dd/MM/yy HH:mm')}</td>
                                    <td className="p-3 font-medium text-slate-800">{m.type.replace('_', ' ')}</td>
                                    <td className="p-3 text-center font-bold text-blue-600">{m.quantity}</td>
                                    <td className="p-3 text-slate-500 truncate max-w-[150px]">{m.reason}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : <p className="text-center text-slate-400 py-10">Sin movimientos.</p>}
                </div>
            </motion.div>
        </div>
    );
};

const EditLotModal = ({ isOpen, onClose, lot }) => {
    const [lotData, setLotData] = useState({ lotNumber: '', expiryDate: '' });
    useEffect(() => { if (lot) setLotData({ lotNumber: lot.lotNumber, expiryDate: lot.expiryDate }); }, [lot]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try { await updateLotInfo(lot.id, lotData); toast.success("Lote actualizado"); onClose(); } catch { toast.error("Error al actualizar"); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Editar Lote</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Lote #</label><input type="text" value={lotData.lotNumber} onChange={e => setLotData({...lotData, lotNumber: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Vencimiento</label><input type="date" value={lotData.expiryDate} onChange={e => setLotData({...lotData, expiryDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"/></div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">Guardar</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
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
        const unsubscribeLots = getInventoryLotsStream((fetchedLots) => { setLots(fetchedLots); setLoading(false); });
        const unsubscribeProductTypes = getProductTypesStream(setProductTypes);
        return () => { unsubscribeLots(); unsubscribeProductTypes(); };
    }, []);

    const filteredLots = lots.filter(lot => (lot.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (lot.lotNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
    
    const handleDeleteLot = async (lot) => {
        // (Lógica idéntica a tu original, omitida por brevedad, asume que está aquí)
        const totalStock = (lot.stockSPS || 0) + (lot.stockTGU || 0);
        Swal.fire({
            title: `¿Eliminar Lote?`,
            text: `Se ajustará el stock (${totalStock} unds) a cero.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, eliminar',
            customClass: { popup: 'rounded-2xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (lot.stockSPS > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'SPS', quantity: lot.stockSPS, reason: 'Eliminación Lote' });
                    if (lot.stockTGU > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'TGU', quantity: lot.stockTGU, reason: 'Eliminación Lote' });
                    toast.success(`Lote eliminado.`);
                } catch (error) { toast.error("Error al eliminar"); }
            }
        });
    };

    const getStatusBadge = (expiryDateStr) => {
        const days = differenceInDays(parseDateStringAsLocal(expiryDateStr), new Date().setHours(0,0,0,0));
        if (days < 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Vencido</span>;
        if (days <= 90) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Por Vencer</span>;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Óptimo</span>;
    };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inventario</h1>
                        <p className="text-slate-500 font-medium">Gestión de lotes y trazabilidad (FEFO)</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsMovementModalOpen(true)} className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                            <FiMove /> Mover Stock
                        </button>
                        <button onClick={() => setIsEntryModalOpen(true)} className="px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
                            <FiPlus /> Nueva Entrada
                        </button>
                    </div>
                </div>
                
                {/* Search & Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative max-w-md">
                            <FiSearch className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar lote o producto..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Lote</th>
                                    <th className="px-6 py-4">Vencimiento</th>
                                    <th className="px-6 py-4 text-center">SPS</th>
                                    <th className="px-6 py-4 text-center">TGU</th>
                                    <th className="px-6 py-4 text-center">Total</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? <tr><td colSpan="8" className="p-8 text-center text-slate-400">Cargando datos...</td></tr> : 
                                filteredLots.length > 0 ? filteredLots.map(lot => {
                                    const total = (lot.stockSPS || 0) + (lot.stockTGU || 0);
                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{lot.productName}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600 bg-slate-50 rounded-md w-fit">{lot.lotNumber}</td>
                                            <td className="px-6 py-4 text-slate-600">{format(parseDateStringAsLocal(lot.expiryDate), 'dd MMM yyyy')}</td>
                                            <td className="px-6 py-4 text-center text-slate-600">{lot.stockSPS || 0}</td>
                                            <td className="px-6 py-4 text-center text-slate-600">{lot.stockTGU || 0}</td>
                                            <td className="px-6 py-4 text-center font-bold text-blue-600">{total}</td>
                                            <td className="px-6 py-4 text-center">{getStatusBadge(lot.expiryDate)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {setSelectedLot(lot); setIsHistoryModalOpen(true)}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Historial"><FiClock size={18}/></button>
                                                    <button onClick={() => {setSelectedLot(lot); setIsEditLotModalOpen(true)}} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Editar"><FiEdit size={18}/></button>
                                                    <button onClick={() => handleDeleteLot(lot)} disabled={total === 0} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30" title="Borrar"><FiTrash2 size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : <tr><td colSpan="8" className="p-10 text-center flex flex-col items-center justify-center text-slate-400"><FiPackage size={40} className="mb-2 opacity-50"/>Sin resultados</td></tr>}
                            </tbody>
                        </table>
                    </div>
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