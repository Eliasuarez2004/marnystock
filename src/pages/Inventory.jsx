// src/pages/Products.jsx
import React, { useState, useEffect } from 'react';
import { getInventoryLotsStream, getLotHistoryStream } from '../firebase/inventoryService';
import { getProductTypesStream } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage';
import { FiPlus, FiClock, FiMove } from 'react-icons/fi';
import { format } from 'date-fns';
import NewEntryModal from '../components/NewEntryModal';
import NewMovementModal from '../components/NewMovementModal'; // <-- IMPORTAMOS EL MODAL REAL

// --- MODAL DE HISTORIAL (SIGUE COMO ESQUELETO POR AHORA) ---
const LotHistoryModal = ({ isOpen, onClose, lot }) => {
    if(!isOpen) return null;
    return <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"><div className="bg-white p-8 rounded-lg"><h2>Historial del Lote {lot?.lotNumber} (en construcción)</h2><button onClick={onClose}>Cerrar</button></div></div>;
};

// --- COMPONENTE PRINCIPAL ---
const Inventory = () => {
    const [lots, setLots] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState(null);

    useEffect(() => {
        const unsubscribeLots = getInventoryLotsStream((fetchedLots) => {
            setLots(fetchedLots);
            setLoading(false);
        });
        const unsubscribeProductTypes = getProductTypesStream(setProductTypes);
        
        return () => {
            unsubscribeLots();
            unsubscribeProductTypes();
        };
    }, []);

    const filteredLots = lots.filter(lot =>
        (lot.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lot.lotNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const openHistoryModal = (lot) => {
        setSelectedLot(lot);
        setIsHistoryModalOpen(true);
    };

    const getStatus = (expiryDateStr) => {
        const expiryDate = new Date(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);

        if (expiryDate < today) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
        }
        if (expiryDate <= ninetyDaysFromNow) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Próximo a Vencer</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Óptimo</span>;
    };

    return (
        <AnimatedPage>
            <div>
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-secondary">Gestión de Inventario por Lote</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setIsMovementModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"><FiMove/> Registrar Movimiento</button>
                        <button onClick={() => setIsEntryModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"><FiPlus/> Nueva Entrada (Compra)</button>
                    </div>
                </div>
                
                <input 
                    type="text" 
                    placeholder="Buscar por Producto o # de Lote..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full p-2 border rounded-md mb-4"
                />
                
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                        <thead className="text-left bg-gray-100">
                            <tr>
                                <th className="p-3">Producto</th>
                                <th className="p-3"># Lote</th>
                                <th className="p-3">Vencimiento</th>
                                <th className="p-3 text-center">Stock SPS</th>
                                <th className="p-3 text-center">Stock TGU</th>
                                <th className="p-3 text-center font-bold">Stock Total</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? ( 
                                <tr><td colSpan="8" className="text-center p-6 text-gray-500">Cargando inventario...</td></tr> 
                            ) : filteredLots.length > 0 ? (
                                filteredLots.map(lot => (
                                    <tr key={lot.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-semibold text-text-dark">{lot.productName}</td>
                                        <td className="p-3 font-mono text-gray-600">{lot.lotNumber}</td>
                                        <td className="p-3">{format(new Date(lot.expiryDate), 'dd/MM/yyyy')}</td>
                                        <td className="p-3 text-center">{lot.stockSPS || 0}</td>
                                        <td className="p-3 text-center">{lot.stockTGU || 0}</td>
                                        <td className="p-3 text-center font-bold text-primary">{(lot.stockSPS || 0) + (lot.stockTGU || 0)}</td>
                                        <td className="p-3">{getStatus(lot.expiryDate)}</td>
                                        <td className="p-3">
                                            <button onClick={() => openHistoryModal(lot)} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><FiClock/> Ver Historial</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="text-center p-6 text-gray-500">No se encontraron lotes. Prueba crear una nueva entrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <NewEntryModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} productTypes={productTypes} />
                <NewMovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} lots={lots} />
                {selectedLot && <LotHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} lot={selectedLot} />}
            </div>
        </AnimatedPage>
    );
};

export default Inventory;