import React, { useState, useEffect } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ClientFormModal = ({ isOpen, onClose, onSave, clientToEdit }) => {
  const [client, setClient] = useState({ name: '', rtn: '', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit) setClient(clientToEdit);
    else setClient({ name: '', rtn: '', email: '', phone: '', address: '' });
  }, [clientToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    await onSave(client); setLoading(false); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FiX size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre</label><input type="text" value={client.name} onChange={e=>setClient({...client, name:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" required/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">RTN</label><input type="text" value={client.rtn} onChange={e=>setClient({...client, rtn:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label><input type="tel" value={client.phone} onChange={e=>setClient({...client, phone:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"/></div>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input type="email" value={client.email} onChange={e=>setClient({...client, email:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" required/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Dirección</label><textarea value={client.address} onChange={e=>setClient({...client, address:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none h-24" required></textarea></div>
            
            <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                    {loading ? 'Guardando...' : <><FiSave/> Guardar Cliente</>}
                </button>
            </div>
        </form>
      </motion.div>
    </div>
  );
};
export default ClientFormModal;