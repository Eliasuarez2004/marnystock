import React, { useState, useEffect } from 'react';
import { getInventoryLotsStream, getLotHistoryStream, createInventoryMovement, updateLotInfo } from '../firebase/inventoryService';
import { getProductTypesStream } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage';
import { 
    FiPlus, FiClock, FiMove, FiEdit, FiTrash2, FiSearch, 
    FiPackage, FiX, FiArrowUpRight, FiArrowDownLeft, FiGift, FiRefreshCw, FiMapPin 
} from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import NewEntryModal from '../components/NewEntryModal';
import NewMovementModal from '../components/NewMovementModal';

// ==========================================
// MODAL DE HISTORIAL (DISEÑO TIMELINE BOOM)
// ==========================================
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

    const getMovementStyle = (type) => {
        switch (type) {
            case 'ENTRADA_COMPRA':
                return { icon: <FiArrowDownLeft />, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Compra' };
            case 'SALIDA_VENTA':
                return { icon: <FiArrowUpRight />, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', label: 'Venta' };
            case 'SALIDA_BONIFICACION':
                return { icon: <FiGift />, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', label: 'Bonificación' };
            case 'ENTRADA_DEVOLUCION':
                return { icon: <FiRefreshCw />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Devolución' };
            default:
                return { icon: <FiClock />, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Ajuste' };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
            >
                {/* Header */}
                <div className="bg-slate-50 p-8 border-b border-slate-200 flex justify-between items-center relative">
                    <div>
                        <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Auditoría de Kardex</h2>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Lote: <span className="text-slate-400 font-mono">{lot?.lotNumber}</span></h3>
                        <p className="text-slate-500 text-sm font-bold mt-1 bg-white w-fit px-3 py-1 rounded-full shadow-sm border border-slate-100">{lot?.productName}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 shadow-sm"><FiX size={24} /></button>
                </div>

                {/* Timeline Content */}
                <div className="overflow-y-auto flex-grow p-8 bg-white custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando movimientos...</span>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pr-4">
                            {history.map((m, idx) => {
                                const style = getMovementStyle(m.type);
                                return (
                                    <motion.div 
                                        key={m.id} 
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                        className="relative pl-8 group"
                                    >
                                        {/* Dot/Icon on Line */}
                                        <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-xl ${style.bg} ${style.color} border-4 border-white shadow-sm flex items-center justify-center text-sm z-10 group-hover:scale-110 transition-transform`}>
                                            {style.icon}
                                        </div>

                                        {/* Content Card */}
                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:border-blue-200 group-hover:bg-white transition-all shadow-sm group-hover:shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${style.color}`}>{style.label}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">{format(new Date(m.date), 'dd MMM, hh:mm a')}</span>
                                            </div>
                                            <h4 className="text-slate-800 font-bold text-sm mb-2">{m.reason || 'Sin descripción'}</h4>
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                                    <FiMapPin size={12}/> {m.fromLocation || m.toLocation || 'BODEGA'}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-black font-mono ${m.type.includes('SALIDA') ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {m.type.includes('SALIDA') ? '-' : '+'}{m.quantity}
                                                    </span>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">unidades</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-30">
                            <FiPackage size={60} className="mx-auto mb-4" />
                            <p className="font-bold uppercase text-xs tracking-widest">Sin historial registrado</p>
                        </div>
                    )}
                </div>

                {/* Summary Footer */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Stock SPS</p>
                            <p className="text-xl font-black text-blue-400 font-mono">{lot?.stockSPS || 0}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Stock TGU</p>
                            <p className="text-xl font-black text-white font-mono">{lot?.stockTGU || 0}</p>
                        </div>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-8">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Saldo Total</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono">{(lot?.stockSPS || 0) + (lot?.stockTGU || 0)}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ==========================================
// MODAL DE EDICIÓN
// ==========================================
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight uppercase text-center">Editar Lote</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Lote</label>
                        <input type="text" value={lotData.lotNumber} onChange={e => setLotData({...lotData, lotNumber: e.target.value})} className="w-full mt-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none font-bold text-slate-700"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Vencimiento</label>
                        <input type="date" value={lotData.expiryDate} onChange={e => setLotData({...lotData, expiryDate: e.target.value})} className="w-full mt-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none font-bold text-slate-700"/>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all uppercase text-sm">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-lg shadow-blue-600/20 transition-all uppercase text-sm">Guardar</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL (INVENTORY)
// ==========================================
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

    const filteredLots = lots.filter(lot => 
        (lot.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (lot.lotNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    
    const handleDeleteLot = async (lot) => {
        const totalStock = (lot.stockSPS || 0) + (lot.stockTGU || 0);
        Swal.fire({
            title: `¿Eliminar Lote ${lot.lotNumber}?`,
            text: `Se ajustará el stock (${totalStock} unds) a cero permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem]' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    if (lot.stockSPS > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'SPS', quantity: lot.stockSPS, reason: 'Eliminación manual de lote' });
                    if (lot.stockTGU > 0) await createInventoryMovement({ type: 'SALIDA_AJUSTE', lotId: lot.id, fromLocation: 'TGU', quantity: lot.stockTGU, reason: 'Eliminación manual de lote' });
                    toast.success(`Lote eliminado correctamente`);
                } catch (error) { toast.error("Error al procesar la eliminación"); }
            }
        });
    };

    const getStatusBadge = (expiryDateStr) => {
        const days = differenceInDays(parseDateStringAsLocal(expiryDateStr), new Date().setHours(0,0,0,0));
        if (days < 0) return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">Vencido</span>;
        if (days <= 90) return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">Por Vencer</span>;
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Óptimo</span>;
    };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">INVENTARIO</h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Control de lotes y trazabilidad FEFO</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsMovementModalOpen(true)} className="px-6 py-4 bg-white text-slate-700 border-2 border-slate-100 font-black rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm flex items-center gap-3 uppercase text-xs tracking-widest">
                            <FiMove size={18}/> Mover Stock
                        </button>
                        <button onClick={() => setIsEntryModalOpen(true)} className="px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 uppercase text-xs tracking-widest">
                            <FiPlus size={18}/> Nueva Entrada
                        </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="relative max-w-lg">
                            <FiSearch className="absolute left-4 top-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar lote o producto..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                <tr>
                                    <th className="px-8 py-5">Producto</th>
                                    <th className="px-8 py-5"># Lote</th>
                                    <th className="px-8 py-5">Vencimiento</th>
                                    <th className="px-8 py-5 text-center">Stock SPS</th>
                                    <th className="px-8 py-5 text-center">Stock TGU</th>
                                    <th className="px-8 py-5 text-center">Total</th>
                                    <th className="px-8 py-5 text-center">Estado</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">Sincronizando inventario...</td></tr>
                                ) : filteredLots.length > 0 ? filteredLots.map(lot => {
                                    const total = (lot.stockSPS || 0) + (lot.stockTGU || 0);
                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="font-black text-slate-800 tracking-tight">{lot.productName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{lot.supplier || 'Proveedor N/D'}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold text-xs">{lot.lotNumber}</span>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-slate-500">
                                                {format(parseDateStringAsLocal(lot.expiryDate), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-8 py-6 text-center font-bold text-slate-600">{lot.stockSPS || 0}</td>
                                            <td className="px-8 py-6 text-center font-bold text-slate-600">{lot.stockTGU || 0}</td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-lg font-black text-blue-600 font-mono">{total}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">{getStatusBadge(lot.expiryDate)}</td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => {setSelectedLot(lot); setIsHistoryModalOpen(true)}} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="Ver Historial"><FiClock size={18}/></button>
                                                    <button onClick={() => {setSelectedLot(lot); setIsEditLotModalOpen(true)}} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="Editar"><FiEdit size={18}/></button>
                                                    <button onClick={() => handleDeleteLot(lot)} disabled={total === 0} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl disabled:opacity-20 transition-all" title="Borrar"><FiTrash2 size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="p-20 text-center">
                                            <FiPackage size={48} className="mx-auto text-slate-200 mb-4"/>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron lotes activos</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <NewEntryModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} productTypes={productTypes} />
                <NewMovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} lots={lots} />
                
                <AnimatePresence>
                    {isHistoryModalOpen && selectedLot && (
                        <LotHistoryModal 
                            isOpen={isHistoryModalOpen} 
                            onClose={() => setIsHistoryModalOpen(false)} 
                            lot={selectedLot} 
                        />
                    )}
                    {isEditLotModalOpen && selectedLot && (
                        <EditLotModal 
                            isOpen={isEditLotModalOpen} 
                            onClose={() => setIsEditLotModalOpen(false)} 
                            lot={selectedLot} 
                        />
                    )}
                </AnimatePresence>
            </div>
        </AnimatedPage>
    );
};

export default Inventory;