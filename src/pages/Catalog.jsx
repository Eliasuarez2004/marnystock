// src/pages/Catalog.jsx (VERSIÓN FINAL CON IMPORTACIÓN CORREGIDA)
import React, { useState, useEffect, useMemo } from 'react';
// --- ¡LA CORRECCIÓN ESTÁ EN ESTA LÍNEA! ---
import { getProductTypesStream, saveProductInfo, deleteProductAndAssociatedLots } from '../firebase/productService';
import { getInventoryLotsStream } from '../firebase/inventoryService';
import AnimatedPage from '../components/AnimatedPage';
import ProductCard from '../components/ProductCard';
import ProductInfoModal from '../components/ProductInfoModal';
import ProductDetailModal from '../components/ProductDetailModal';
import Swal from 'sweetalert2';
import SkeletonCard from '../components/SkeletonCard';
import { FiPlus } from 'react-icons/fi';

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

        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => {
            unsubscribeProducts();
            unsubscribeLots();
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        // Solo deja de cargar si los datos han llegado. Si no hay datos, espera al timeout.
        if (productTypes.length > 0 || lots.length > 0 || !loading) {
            setLoading(false);
        }
    }, [productTypes, lots]);

    const productsWithStock = useMemo(() => {
        return productTypes.map(product => {
            const associatedLots = lots.filter(lot => lot.productId === product.id);
            return { ...product, batches: associatedLots };
        });
    }, [productTypes, lots]);

    const filteredProducts = productsWithStock.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOpenInfoModal = (product = null) => {
        setProductToEdit(product);
        setIsInfoModalOpen(true);
    };

    const handleCloseInfoModal = () => {
        setIsInfoModalOpen(false);
        setProductToEdit(null);
    };

    const handleSaveInfo = async (productData, imageFile) => {
        await saveProductInfo({ ...productData, id: productToEdit?.id, imageUrl: productToEdit?.imageUrl }, imageFile);
    };

    const handleDelete = async (product) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `¡Eliminarás "${product.name}" y TODO su inventario asociado! Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar todo!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if(result.isConfirmed) {
                try {
                    // Ahora la función está importada y disponible
                    await deleteProductAndAssociatedLots(product);
                    Swal.fire('Eliminado!', 'El producto y todo su inventario han sido eliminados.', 'success');
                } catch(error) {
                    console.error("Error al eliminar el producto:", error);
                    Swal.fire('Error!', 'No se pudo eliminar el producto.', 'error');
                }
            }
        });
    };

    const handleOpenDetailModal = (product) => {
        setSelectedProductForDetail(product);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedProductForDetail(null);
    };

    return (
        <AnimatedPage>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary">Catálogo de Productos</h1>
                <button onClick={() => handleOpenInfoModal()} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2">
                    <FiPlus/> Nuevo Producto
                </button>
            </div>

            <input type="text" placeholder="Buscar producto por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md mb-4"/>
            
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
                <div className="text-center py-10 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl text-gray-700">No hay productos en el catálogo</h3>
                    <p className="text-gray-500 mt-2">Haz clic en "+ Nuevo Producto" para empezar a construir tu catálogo.</p>
                </div>
            )}

            <ProductInfoModal 
                isOpen={isInfoModalOpen}
                onClose={handleCloseInfoModal}
                onSave={handleSaveInfo}
                productToEdit={productToEdit}
            />
            <ProductDetailModal
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                product={selectedProductForDetail}
            />
        </AnimatedPage>
    );
};

export default Catalog;