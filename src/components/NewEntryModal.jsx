import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { addMultiProductEntry } from '../firebase/inventoryService';
import { FiPlus, FiTrash2, FiX, FiCheck } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';

const NewEntryModal = ({ isOpen, onClose, productTypes }) => {
    const [lotNumber, setLotNumber] = useState('');
    const [supplier, setSupplier] = useState('');
    const [entryItems, setEntryItems] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [quantitySPS, setQuantitySPS] = useState('');
    const [quantityTGU, setQuantityTGU] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLotNumber(''); setSupplier(''); setEntryItems([]); setSelectedProductId(''); setExpiryDate(''); setQuantitySPS(''); setQuantityTGU('');
        }
    }, [isOpen]);

    const handleAddItem = () => {
        if (!selectedProductId || !expiryDate) return toast.warn('Datos incompletos.');
        const sps = Number(quantitySPS)||0, tgu = Number(quantityTGU)||0;
        if (sps <= 0 && tgu <= 0) return toast.warn('Ingresa cantidad.');
        
        const prod = productTypes.find(p => p.id === selectedProductId);
        setEntryItems([...entryItems, { productId: prod.id, name: prod.name, expiryDate, quantitySPS: sps, quantityTGU: tgu }]);
        setSelectedProductId(''); setExpiryDate(''); setQuantitySPS(''); setQuantityTGU('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addMultiProductEntry({ lotNumber, supplier, items: entryItems });
            toast.success('Entrada registrada'); onClose();
        } catch { toast.error('Error al registrar'); }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Nueva Entrada (Compra)</h2>
                    <button onClick={onClose}><FiX className="text-slate-400 hover:text-slate-600" size={24}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Header Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase"># Lote / Pedido</label>
                            <input type="text" value={lotNumber} onChange={e=>setLotNumber(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="EJ: PED-2026-001"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Proveedor</label>
                            <input type="text" value={supplier} onChange={e=>setSupplier(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="Nombre del proveedor"/>
                        </div>
                    </div>

                    {/* Add Item Box */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 border-dashed">
                        <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-12 md:col-span-4">
                                <label className="text-xs font-bold text-slate-500 uppercase">Producto</label>
                                <select value={selectedProductId} onChange={e=>setSelectedProductId(e.target.value)} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl outline-none"><option value="">Seleccionar...</option>{productTypes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                            </div>
                            <div className="col-span-6 md:col-span-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Vencimiento</label>
                                <input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl outline-none"/>
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase text-center block">SPS</label>
                                <input type="number" value={quantitySPS} onChange={e=>setQuantitySPS(e.target.value)} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl outline-none text-center" placeholder="0"/>
                            </div>
                            <div className="col-span-3 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase text-center block">TGU</label>
                                <input type="number" value={quantityTGU} onChange={e=>setQuantityTGU(e.target.value)} className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl outline-none text-center" placeholder="0"/>
                            </div>
                            <div className="col-span-12 md:col-span-1">
                                <button onClick={handleAddItem} className="w-full p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex justify-center"><FiPlus size={20}/></button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr><th className="p-3 text-left">Producto</th><th className="p-3 text-center">Vence</th><th className="p-3 text-center">SPS</th><th className="p-3 text-center">TGU</th><th className="p-3"></th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence>{entryItems.map((item, i) => (
                                    <motion.tr key={i} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                                        <td className="p-3 font-medium text-slate-700">{item.name}</td><td className="p-3 text-center text-slate-500">{item.expiryDate}</td><td className="p-3 text-center font-bold">{item.quantitySPS}</td><td className="p-3 text-center font-bold">{item.quantityTGU}</td>
                                        <td className="p-3 text-center"><button onClick={()=>setEntryItems(entryItems.filter((_,idx)=>idx!==i))} className="text-rose-400 hover:text-rose-600"><FiTrash2/></button></td>
                                    </motion.tr>
                                ))}</AnimatePresence>
                                {entryItems.length===0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">Sin items añadidos</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-6 py-3 text-slate-600 font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-3 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2">
                        {loading ? 'Guardando...' : <><FiCheck/> Confirmar Entrada</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
export default NewEntryModal;