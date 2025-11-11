// src/components/ProductDetailModal.jsx
import React from 'react';

const ProductDetailModal = ({ isOpen, onClose, product }) => {
    if (!isOpen || !product) return null;

    const totalSPS = product.batches?.reduce((sum, batch) => sum + (batch.quantitySPS || 0), 0) || 0;
    const totalTGU = product.batches?.reduce((sum, batch) => sum + (batch.quantityTGU || 0), 0) || 0;
    const totalStock = totalSPS + totalTGU;
    
    // Ordenar lotes por fecha de vencimiento para visualización (FEFO)
    const sortedBatches = product.batches?.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-secondary">{product.name}</h2>
                        <p className="text-gray-500">Detalles de Inventario</p>
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold">&times;</button>
                </div>
                
                {/* Resumen de Stock */}
                <div className="grid grid-cols-3 gap-4 text-center mb-6 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <p className="text-sm text-gray-500">Stock en SPS</p>
                        <p className="text-2xl font-bold">{totalSPS}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Stock en TGU</p>
                        <p className="text-2xl font-bold">{totalTGU}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Stock Total</p>
                        <p className="text-2xl font-bold text-primary">{totalStock}</p>
                    </div>
                </div>

                {/* Tabla de Lotes */}
                <h3 className="font-bold text-lg mb-2">Lotes Disponibles</h3>
                <div className="overflow-y-auto max-h-64">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2"># Lote</th>
                                <th className="p-2">Vencimiento</th>
                                <th className="p-2">Proveedor</th>
                                <th className="p-2 text-center">Cant. SPS</th>
                                <th className="p-2 text-center">Cant. TGU</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBatches && sortedBatches.length > 0 ? (
                                sortedBatches.map(batch => (
                                    <tr key={batch.id} className="border-b">
                                        <td className="p-2 font-mono">{batch.lotNumber}</td>
                                        <td className="p-2">{batch.expiryDate}</td>
                                        <td className="p-2">{batch.supplier}</td>
                                        <td className="p-2 text-center">{batch.quantitySPS || 0}</td>
                                        <td className="p-2 text-center">{batch.quantityTGU || 0}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center p-4 text-gray-500">No hay lotes registrados para este producto.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;