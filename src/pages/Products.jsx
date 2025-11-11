// src/pages/Products.jsx (actualizado)
import React, { useState, useEffect } from 'react';
import ProductFormModal from '../components/ProductFormModal';
import ProductCard from '../components/ProductCard';
import { addProduct, getProducts, updateProduct, deleteProduct } from '../firebase/productService';
import Swal from 'sweetalert2';
import AnimatedPage from '../components/AnimatedPage';
import SkeletonCard from '../components/SkeletonCard';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La función getProducts ahora devuelve la función de 'unsubscribe'
    const unsubscribe = getProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
      setLoading(false);
    });
    
    // Limpiamos la suscripción cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

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
      // Lógica de actualización
      await updateProduct(productToEdit.id, productData, imageFile);
    } else {
      // Lógica de creación
      await addProduct(productData, imageFile);
    }
  };

  const handleDeleteProduct = async (product) => {
     Swal.fire({ // REEMPLAZADO
        title: '¿Estás seguro?',
        text: `No podrás revertir la eliminación de "${product.name}"!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#CC0033', // Nuestro color primario
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteProduct(product.id, product.imageUrl);
                Swal.fire(
                    'Eliminado!',
                    'El producto ha sido eliminado.',
                    'success'
                );
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                Swal.fire(
                    'Error!',
                    'No se pudo eliminar el producto.',
                    'error'
                );
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
      
      {loading ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Muestra 4 esqueletos mientras carga */}
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
            <ProductCard 
                key={product.id} 
                product={product}
                onEdit={handleOpenModal}
                onDelete={handleDeleteProduct}
            />
        ))}
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