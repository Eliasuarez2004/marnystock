import React, { useMemo } from 'react';
import { FiEdit, FiTrash2, FiBox } from 'react-icons/fi';

const ProductCard = ({ product, onEdit, onDelete, onViewDetails }) => {
    const { totalStock, status, lotCount } = useMemo(() => {
        if (!product.batches) return { totalStock: 0, status: 'Agotado', lotCount: 0 };
        const stock = product.batches.reduce((acc, b) => acc + (b.stockSPS || 0) + (b.stockTGU || 0), 0);
        const lots = product.batches.filter(b => (b.stockSPS || 0) + (b.stockTGU || 0) > 0).length;
        
        let st = 'Agotado';
        if (stock > 10) st = 'En Stock';
        else if (stock > 0) st = 'Bajo Stock';
        
        return { totalStock: stock, status: st, lotCount: lots };
    }, [product.batches]);

    const badgeColors = {
        'En Stock': 'bg-emerald-500 text-white shadow-emerald-500/30',
        'Bajo Stock': 'bg-amber-500 text-white shadow-amber-500/30',
        'Agotado': 'bg-rose-500 text-white shadow-rose-500/30'
    };

    return (
        <div className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
            {/* Image Area */}
            <div className="relative h-48 overflow-hidden cursor-pointer bg-slate-100" onClick={() => onViewDetails(product)}>
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><FiBox size={48}/></div>
                )}
                {/* Floating Badge */}
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${badgeColors[status]}`}>
                    {status}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-5 flex-grow flex flex-col justify-between">
                <div onClick={() => onViewDetails(product)} className="cursor-pointer">
                    <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 h-8">{product.description}</p>
                    
                    <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-400">
                        <div className="flex items-center gap-1"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{lotCount} Lotes</span></div>
                        <div className="flex items-center gap-1"><span className={`px-2 py-0.5 rounded ${totalStock > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{totalStock} Unds.</span></div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-lg font-black text-slate-800">L {parseFloat(product.price).toFixed(2)}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(product)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><FiEdit size={16}/></button>
                        <button onClick={() => onDelete(product)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"><FiTrash2 size={16}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ProductCard;