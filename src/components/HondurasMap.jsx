import React from 'react';
import { FiMapPin } from 'react-icons/fi';
import { motion } from 'framer-motion';

const HondurasMap = ({ data, onSelectDept, selectedDept }) => {
    // Aquí podrías usar un SVG real de Honduras, pero para este ejemplo 
    // usaremos un Grid visual muy profesional que representa las zonas.
    
    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden h-full min-h-[400px]">
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <FiMapPin size={150} />
            </div>

            <h3 className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] mb-6">Mapa de Distribución</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
                {data.map((dept) => (
                    <motion.button
                        key={dept.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectDept(dept)}
                        className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            selectedDept?.name === dept.name 
                            ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                            : 'border-slate-800 bg-slate-800/40 hover:border-slate-600'
                        }`}
                    >
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter mb-1">{dept.name}</p>
                        <p className="text-sm font-bold text-white">L {dept.sales.toLocaleString()}</p>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-[8px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 uppercase font-black">
                                {dept.customerCount} Clientes
                            </span>
                        </div>
                    </motion.button>
                ))}
            </div>

            {data.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-600 uppercase font-black text-xs tracking-widest italic">
                    Sin datos geográficos
                </div>
            )}
        </div>
    );
};

export default HondurasMap;