import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import ProductInfoModal from '../components/ProductInfoModal';
import BatchEntryModal from '../components/BatchEntryModal';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { saveProductInfo, getProductsWithBatches, deleteProductAndBatches } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage';
import ProductDetailModal from '../components/ProductDetailModal';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubscribe = getProductsWithBatches((fetchedProducts) => {
            setProducts(fetchedProducts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOpenInfoModal = (product = null) => {
        setProductToEdit(product);
        setIsInfoModalOpen(true);
    };
    const handleCloseInfoModal = () => {
        setIsInfoModalOpen(false);
        setProductToEdit(null);
    };

    const handleOpenBatchModal = () => setIsBatchModalOpen(true);
    const handleCloseBatchModal = () => setIsBatchModalOpen(false);

    const handleOpenDetailModal = (product) => {
        setSelectedProductForDetail(product);
        setIsDetailModalOpen(true);
    };
    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedProductForDetail(null);
    };

    const handleSaveInfo = async (productData, imageFile) => {
        await saveProductInfo({ ...productData, id: productToEdit?.id }, imageFile);
    };

    const handleDelete = async (product) => {
         Swal.fire({
            title: '¿Estás seguro?',
            text: `¡Eliminarás "${product.name}" y todos sus lotes!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#CC0033',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar todo!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if(result.isConfirmed) {
                try {
                    await deleteProductAndBatches(product);
                    Swal.fire('Eliminado!', 'El producto y sus lotes han sido eliminados.', 'success');
                } catch(error) {
                    console.error("Error al eliminar el producto:", error);
                    Swal.fire('Error!', 'No se pudo eliminar el producto.', 'error');
                }
            }
        });
    };

    return (
        <AnimatedPage>
            <div>
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-secondary">Gestión de Inventario</h1>
                    <div className="flex gap-2">
                         <button onClick={handleOpenBatchModal} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                            + Registrar Entrada
                        </button>
                        <button onClick={() => handleOpenInfoModal()} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-red-700 transition-colors">
                            + Nuevo Tipo de Producto
                        </button>
                    </div>
                </div>
                
                <div className="mb-4">
                    <input 
                        type="text"
                        placeholder="Buscar producto por nombre..."
                        className="w-full p-2 border rounded-md"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.gantt.value)}
                    />
                </div>
                
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
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
                        <h3 className="text-xl text-gray-700">No se encontraron productos</h3>
                        <p className="text-gray-500 mt-2">Intenta con un término de búsqueda diferente.</p>
                    </div>
                )}
                
                <ProductInfoModal 
                    isOpen={isInfoModalOpen}
                    onClose={handleCloseInfoModal}
                    onSave={handleSaveInfo}
                    productToEdit={productToEdit}
                />
                <BatchEntryModal 
                    isOpen={isBatchModalOpen}
                    onClose={handleCloseBatchModal}
                    products={products}
                    onBatchAdded={() => {}}
                />
                <ProductDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    product={selectedProductForDetail}
                />
            </div>
        </AnimatedPage>
    );
};

export default Products;