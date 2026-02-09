import React, { useState, useEffect, useMemo } from 'react';
import { getProductTypesStream, saveProductInfo, deleteProductAndAssociatedLots } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import AnimatedPage from '../components/AnimatedPage';
import ProductCard from '../components/ProductCard';
import ProductInfoModal from '../components/ProductInfoModal';
import ProductDetailModal from '../components/ProductDetailModal';
import Swal from 'sweetalert2';
import SkeletonCard from '../components/SkeletonCard';
import { FiPlus, FiSearch } from 'react-icons/fi';

const Catalog = () => {
    const [productTypes, setProductTypes] = useState([]);
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribeProducts = getProductTypesStream(setProductTypes);
        const unsubscribeLots = getInventoryLotsStream(setLots);
        const timer = setTimeout(() => setLoading(false), 3000); // Fallback

        return () => {
            unsubscribeProducts();
            unsubscribeLots();
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (productTypes.length > 0 || lots.length > 0 || !loading) setLoading(false);
    }, [productTypes, lots]);

    const productsWithStock = useMemo(() => {
        return productTypes.map(product => {
            const associatedLots = lots.filter(lot => lot.productId === product.id);
            return { ...product, batches: associatedLots };
        });
    }, [productTypes, lots]);

    const filteredProducts = productsWithStock.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOpenInfoModal = (product = null) => { setProductToEdit(product); setIsInfoModalOpen(true); };
    const handleCloseInfoModal = () => { setIsInfoModalOpen(false); setProductToEdit(null); };
    const handleSaveInfo = async (productData, imageFile) => { await saveProductInfo({ ...productData, id: productToEdit?.id, imageUrl: productToEdit?.imageUrl }, imageFile); };

    const handleDelete = async (product) => {
        Swal.fire({
            title: '¿Eliminar Producto?',
            text: `Se borrará "${product.name}" y todo su historial de inventario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-2xl' }
        }).then(async (result) => {
            if(result.isConfirmed) {
                try {
                    await deleteProductAndAssociatedLots(product);
                    Swal.fire({ title: '¡Eliminado!', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
                } catch(error) {
                    Swal.fire({ title: 'Error', text: 'No se pudo eliminar.', icon: 'error', customClass: { popup: 'rounded-2xl' } });
                }
            }
        });
    };

    const handleOpenDetailModal = (product) => { setSelectedProductForDetail(product); setIsDetailModalOpen(true); };
    const handleCloseDetailModal = () => { setIsDetailModalOpen(false); setSelectedProductForDetail(null); };

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Catálogo</h1>
                        <p className="text-slate-500 font-medium">Gestiona tus productos y precios</p>
                    </div>
                    <div className="flex w-full md:w-auto gap-4">
                        <div className="relative w-full md:w-80">
                            <FiSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar productos..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={() => handleOpenInfoModal()} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <FiPlus size={20}/> Nuevo
                        </button>
                    </div>
                </div>

                {/* Grid Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <ProductCard 
                                key={product.id} 
                                product={product}
                                onEdit={handleOpenInfoModal}
                                onDelete={handleDelete}
                                onViewDetails={handleOpenDetailModal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <FiSearch className="text-slate-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No hay productos encontrados</h3>
                        <p className="text-slate-500 mt-2">Intenta con otro término o agrega un nuevo producto.</p>
                    </div>
                )}

                <ProductInfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} onSave={handleSaveInfo} productToEdit={productToEdit} />
                <ProductDetailModal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} product={selectedProductForDetail} />
            </div>
        </AnimatedPage>
    );
};

export default Catalog;