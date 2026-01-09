// src/components/ProductCard.jsx (VERSIÓN FINAL "INTELIGENTE")
import React, { useMemo } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { parseDateStringAsLocal } from '../utils/dateUtils';

const ProductCard = ({ product, onEdit, onDelete, onViewDetails }) => {
    // Usamos useMemo para calcular estos valores solo cuando los datos del producto cambian
    const { totalStock, status, lotCount, nextExpiry } = useMemo(() => {
        if (!product.batches || product.batches.length === 0) {
            return { totalStock: 0, status: 'Agotado', lotCount: 0, nextExpiry: null };
        }

        let stock = 0;
        let activeLots = 0;
        let soonestExpiryDate = null;

        product.batches.forEach(batch => {
            
            // Usamos 'stockSPS' y 'stockTGU' en lugar de 'quantitySPS'/'quantityTGU'
            const currentStockInBatch = (batch.stockSPS || 0) + (batch.stockTGU || 0);
            
            if (currentStockInBatch > 0) {
                stock += currentStockInBatch;
                activeLots++;
                
                const expiry = parseDateStringAsLocal(batch.expiryDate);
                if (!soonestExpiryDate || expiry < soonestExpiryDate) {
                    soonestExpiryDate = expiry;
                }
            }
        });

        let currentStatus = 'Agotado';
        if (stock > 10) currentStatus = 'En Stock';
        else if (stock > 0) currentStatus = 'Bajo Stock';

        return {
            totalStock: stock,
            status: currentStatus,
            lotCount: activeLots,
            nextExpiry: soonestExpiryDate ? soonestExpiryDate.toLocaleDateString('es-HN') : 'N/A'
        };
    }, [product.batches]);

    const statusInfo = {
        'En Stock': { color: 'bg-green-500', text: 'En Stock' },
        'Bajo Stock': { color: 'bg-yellow-500', text: 'Bajo Stock' },
        'Agotado': { color: 'bg-red-500', text: 'Agotado' }
    };

    return (
        <div className="bg-light-card rounded-lg shadow-md overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div onClick={() => onViewDetails(product)} className="cursor-pointer">
                <div className="relative">
                    <img src={product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Imagen'} alt={product.name} className="w-full h-48 object-cover"/>
                    <div className={`absolute top-2 right-2 flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold text-white ${statusInfo[status].color}`}>
                        <span className={`w-2 h-2 rounded-full bg-white`}></span>
                        {statusInfo[status].text}
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-bold text-text-dark truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 h-10">{product.description}</p>
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                        <span>Lotes Activos: <strong className="text-text-dark">{lotCount}</strong></span>
                        <span>Próximo Vencimiento: <strong className="text-text-dark">{nextExpiry}</strong></span>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t flex justify-between items-center">
                <span className="text-xl font-bold text-primary">LPS {parseFloat(product.price).toFixed(2)}</span>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(product)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"><FiEdit size={14}/> Editar</button>
                    <button onClick={() => onDelete(product)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"><FiTrash2 size={14}/> Borrar</button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;