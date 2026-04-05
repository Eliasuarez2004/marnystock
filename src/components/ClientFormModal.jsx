import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiMapPin } from 'react-icons/fi';
import { motion } from 'framer-motion';

// Lista oficial de departamentos de Honduras
const DEPARTAMENTOS_HN = [
    "Atlántida", "Choluteca", "Colón", "Comayagua", "Copán", "Cortés", 
    "El Paraíso", "Francisco Morazán", "Gracias a Dios", "Intibucá", 
    "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho", 
    "Santa Bárbara", "Valle", "Yoro"
];

const ClientFormModal = ({ isOpen, onClose, onSave, clientToEdit }) => {
  const [client, setClient] = useState({ 
    name: '', 
    rtn: '', 
    email: '', 
    phone: '', 
    address: '',
    departamento: 'Cortés' // Valor por defecto
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
        setClient({
            ...clientToEdit,
            departamento: clientToEdit.departamento || 'Cortés'
        });
    } else {
        setClient({ 
            name: '', 
            rtn: '', 
            email: '', 
            phone: '', 
            address: '',
            departamento: 'Cortés' 
        });
    }
  }, [clientToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    try {
        await onSave(client); 
        onClose();
    } catch (error) {
        console.error("Error al guardar cliente:", error);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-100"
      >
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {clientToEdit ? 'Editar Perfil' : 'Nuevo Cliente'}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Información Comercial</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all hover:bg-rose-50"
            >
                <FiX size={24}/>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre Completo */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nombre de la Empresa / Cliente</label>
                <input 
                    type="text" 
                    value={client.name} 
                    onChange={e => setClient({...client, name: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700" 
                    placeholder="Ej. Farmacia La Esperanza"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* RTN */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">RTN</label>
                    <input 
                        type="text" 
                        value={client.rtn} 
                        onChange={e => setClient({...client, rtn: e.target.value})} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-mono text-sm"
                        placeholder="0000-0000-000000"
                    />
                </div>
                {/* Departamento */}
                <div>
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-1 block flex items-center gap-1">
                        <FiMapPin size={10}/> Departamento
                    </label>
                    <select 
                        value={client.departamento} 
                        onChange={e => setClient({...client, departamento: e.target.value})} 
                        className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-blue-700 appearance-none cursor-pointer"
                    >
                        {DEPARTAMENTOS_HN.map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Teléfono */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Teléfono</label>
                    <input 
                        type="tel" 
                        value={client.phone} 
                        onChange={e => setClient({...client, phone: e.target.value})} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold"
                        placeholder="9999-9999"
                    />
                </div>
                {/* Email */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                    <input 
                        type="email" 
                        value={client.email} 
                        onChange={e => setClient({...client, email: e.target.value})} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-sm"
                        placeholder="correo@ejemplo.com"
                        required
                    />
                </div>
            </div>

            {/* Dirección */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Dirección Exacta</label>
                <textarea 
                    value={client.address} 
                    onChange={e => setClient({...client, address: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none h-24 resize-none text-sm font-medium" 
                    placeholder="Barrio, Calle, Ave, Referencia..."
                    required
                ></textarea>
            </div>
            
            {/* Botón de Acción */}
            <div className="pt-4">
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-sm disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <><FiSave size={20}/> {clientToEdit ? 'Guardar Cambios' : 'Registrar Cliente'}</>
                    )}
                </button>
            </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ClientFormModal;