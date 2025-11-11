// src/pages/Products.jsx (actualizado con búsqueda)
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import ProductFormModal from '../components/ProductFormModal';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { addProduct, getProducts, updateProduct, deleteProduct } from '../firebase/productService';
import AnimatedPage from '../components/AnimatedPage'; // Asegúrate de que AnimatedPage esté importado si lo usas

const Products = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para la búsqueda

  useEffect(() => {
    const unsubscribe = getProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtra los productos en base al término de búsqueda
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product = null) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const handleSaveProduct = async (productData, imageFile) => {
    if (productToEdit) {
      await updateProduct(productToEdit.id, productData, imageFile);
    } else {
      await addProduct(productData, imageFile);
    }
  };

  const handleDeleteProduct = async (product) => {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `No podrás revertir la eliminación de "${product.name}"!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#CC0033',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteProduct(product.id, product.imageUrl);
                Swal.fire('Eliminado!', 'El producto ha sido eliminado.', 'success');
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                Swal.fire('Error!', 'No se pudo eliminar el producto.', 'error');
            }
        }
    });
  };

  return (
    <AnimatedPage>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-secondary">Gestión de Productos</h1>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-red-700 transition-colors"
          >
            + Nuevo Producto
          </button>
        </div>
        
        {/* Barra de Búsqueda */}
        <div className="mb-4">
            <input 
                type="text"
                placeholder="Buscar producto por nombre..."
                className="w-full p-2 border rounded-md"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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
                onEdit={handleOpenModal}
                onDelete={handleDeleteProduct}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
              <h3 className="text-xl text-gray-700">No se encontraron productos</h3>
              <p className="text-gray-500 mt-2">Intenta con un término de búsqueda diferente.</p>
          </div>
        )}

        <ProductFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          productToEdit={productToEdit}
        />
      </div>
    </AnimatedPage>
  );
};

export default Products;