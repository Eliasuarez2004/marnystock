import React, { useMemo } from 'react';

const ProductCard = ({ product, onEdit, onDelete, onViewDetails }) => {
    // Calcula el stock total y el estado de vencimiento usando useMemo para eficiencia
    const { totalStock, expiryStatus } = useMemo(() => {
        if (!product.batches || product.batches.length === 0) {
            return { totalStock: 0, expiryStatus: 'NO_STOCK' };
        }

        let totalStock = 0;
        let soonestExpiryDate = null;

        product.batches.forEach(batch => {
            const currentStock = (batch.quantitySPS || 0) + (batch.quantityTGU || 0);
            if(currentStock > 0) {
                totalStock += currentStock;
                const expiry = new Date(batch.expiryDate);
                if (!soonestExpiryDate || expiry < soonestExpiryDate) {
                    soonestExpiryDate = expiry;
                }
            }
        });

        if (totalStock === 0) {
          return { totalStock: 0, expiryStatus: 'NO_STOCK' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar para comparar solo fechas
        const daysUntilExpiration = Math.ceil((soonestExpiryDate - today) / (1000 * 60 * 60 * 24));
        
        let status = 'OK';
        if (daysUntilExpiration <= 0) status = 'EXPIRED';
        else if (daysUntilExpiration <= 30) status = 'EXPIRING_SOON';
        
        return { totalStock, expiryStatus: status };
    }, [product.batches]);

    const statusInfo = {
        EXPIRED: { text: '¡Vencido!', color: 'text-red-600 font-bold' },
        EXPIRING_SOON: { text: '¡Vence pronto!', color: 'text-yellow-600 font-bold' },
        OK: { text: 'En stock', color: 'text-green-600' },
        NO_STOCK: { text: 'Sin stock', color: 'text-gray-500' }
    };

    const isLowStock = totalStock < 10 && totalStock > 0;

    return (
        <div className={`bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 border-2 ${expiryStatus === 'EXPIRED' ? 'border-red-500' : 'border-transparent'}`}>
            <div onClick={() => onViewDetails(product)} className="cursor-pointer">
                <img 
                    src={product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Imagen'} 
                    alt={product.name} 
                    className="w-full h-48 object-cover"
                />
                <div className="p-4">
                    <h3 className="text-xl font-bold text-secondary">{product.name}</h3>
                    <p className="text-gray-600 mt-1 text-sm truncate h-10">{product.description}</p>
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-lg font-semibold text-primary">LPS {parseFloat(product.price).toFixed(2)}</span>
                        <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-green-600'}`}>
                            Stock Total: {totalStock}
                        </span>
                    </div>
                    <div className="mt-2 text-sm">
                        <p className={statusInfo[expiryStatus].color}>{statusInfo[expiryStatus].text}</p>
                    </div>
                </div>
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2">
                <button onClick={() => onEdit(product)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Editar Info</button>
                <button onClick={() => onDelete(product)} className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Borrar</button>
            </div>
        </div>
    );
};

export default ProductCard;