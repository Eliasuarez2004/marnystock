// src/components/ProductDetailModal.jsx (VERSIÓN FINAL "CENTRO DE INTELIGENCIA")
import React, { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { parseDateStringAsLocal } from '../utils/dateUtils';

// Componente de Badge de Estado para reutilizar
const StatusBadge = ({ expiryDateStr }) => {
    const expiryDate = parseDateStringAsLocal(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiration = differenceInDays(expiryDate, today);

    if (daysUntilExpiration < 0) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
    }
    if (daysUntilExpiration <= 90) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Próximo a Vencer</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Óptimo</span>;
};

const ProductDetailModal = ({ isOpen, onClose, product }) => {
    // Usamos useMemo para cálculos eficientes
    const { totalSPS, totalTGU, totalStock, inventoryValue, nextExpiryInfo, sortedBatches } = useMemo(() => {
        if (!product || !product.batches || product.batches.length === 0) {
            return { totalSPS: 0, totalTGU: 0, totalStock: 0, inventoryValue: 0, nextExpiryInfo: 'N/A', sortedBatches: [] };
        }

        // --- ¡LA CORRECCIÓN DEL BUG ESTÁ AQUÍ! ---
        // Usamos 'stockSPS' y 'stockTGU' de nuestra nueva estructura de 'inventory_lots'
        const sps = product.batches.reduce((sum, batch) => sum + (batch.stockSPS || 0), 0);
        const tgu = product.batches.reduce((sum, batch) => sum + (batch.stockTGU || 0), 0);
        const total = sps + tgu;
        const value = total * (product.price || 0);
        
        const batchesWithStock = product.batches.filter(b => (b.stockSPS || 0) + (b.stockTGU || 0) > 0);
        const sorted = batchesWithStock.sort((a, b) => parseDateStringAsLocal(a.expiryDate) - parseDateStringAsLocal(b.expiryDate));

        let expiryInfo = 'Sin stock activo';
        if (sorted.length > 0) {
            const nextExpiryDate = new Date(sorted[0].expiryDate);
            const days = differenceInDays(nextExpiryDate, new Date());
            if (days < 0) {
                expiryInfo = `Vencido hace ${Math.abs(days)} días`;
            } else {
                expiryInfo = `Vence en ${days} días`;
            }
        }

        return { totalSPS: sps, totalTGU: tgu, totalStock: total, inventoryValue: value, nextExpiryInfo: expiryInfo, sortedBatches: product.batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)) };

    }, [product]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <motion.div 
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-text-dark">{product.name}</h2>
                        <p className="text-gray-500">Detalles de Inventario</p>
                    </div>
                    <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-800">&times;</button>
                </div>
                
                {/* Resumen Analítico */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center mb-6 bg-gray-50 p-4 rounded-lg">
                    <div><p className="text-sm text-gray-500">Stock en SPS</p><p className="text-2xl font-bold">{totalSPS}</p></div>
                    <div><p className="text-sm text-gray-500">Stock en TGU</p><p className="text-2xl font-bold">{totalTGU}</p></div>
                    <div><p className="text-sm text-gray-500">Stock Total</p><p className="text-2xl font-bold text-primary">{totalStock}</p></div>
                    <div><p className="text-sm text-gray-500">Valor Inventario</p><p className="text-2xl font-bold">L {inventoryValue.toFixed(2)}</p></div>
                </div>
                <div className="text-center mb-6 text-sm">
                    Próximo Vencimiento: <strong className={nextExpiryInfo.includes('Vencido') ? 'text-red-600' : 'text-yellow-600'}>{nextExpiryInfo}</strong>
                </div>

                {/* Tabla de Lotes */}
                <h3 className="font-bold text-lg mb-2">Lotes Disponibles (Ordenados por Vencimiento - FEFO)</h3>
                <div className="overflow-y-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2"># Lote</th>
                                <th className="p-2">Vencimiento</th>
                                <th className="p-2">Proveedor</th>
                                <th className="p-2 text-center">Cant. SPS</th>
                                <th className="p-2 text-center">Cant. TGU</th>
                                <th className="p-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBatches && sortedBatches.length > 0 ? (
                                sortedBatches.map(batch => (
                                    <tr key={batch.id} className="border-b">
                                        <td className="p-2 font-mono">{batch.lotNumber}</td>
                                        <td className="p-2">{format(parseDateStringAsLocal(batch.expiryDate), 'dd/MM/yyyy')}</td>
                                        <td className="p-2">{batch.supplier}</td>
                                        <td className="p-2 text-center">{batch.stockSPS || 0}</td>
                                        <td className="p-2 text-center">{batch.stockTGU || 0}</td>
                                        <td className="p-2"><StatusBadge expiryDateStr={batch.expiryDate} /></td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center p-6 text-gray-500">No hay lotes registrados para este producto.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default ProductDetailModal;