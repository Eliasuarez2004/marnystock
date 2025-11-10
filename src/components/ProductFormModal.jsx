// src/components/ProductFormModal.jsx
import React, { useState, useEffect } from 'react';

const ProductFormModal = ({ isOpen, onClose, onSave, productToEdit }) => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    expirationDate: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        name: productToEdit.name,
        description: productToEdit.description,
        price: productToEdit.price,
        stock: productToEdit.stock,
        expirationDate: productToEdit.expirationDate,
      });
    } else {
      // Reset form when creating a new product
      setProduct({ name: '', description: '', price: '', stock: '', expirationDate: '' });
    }
    setImageFile(null); // Reset image on open
  }, [productToEdit, isOpen]);


  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        await onSave(product, imageFile);
        onClose(); // Close modal on success
    } catch (err) {
        setError('No se pudo guardar el producto. Inténtalo de nuevo.');
        console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-secondary mb-4">
          {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* ... Campos del formulario ... */}
          <input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Nombre del Producto" required className="w-full p-2 mb-3 border rounded"/>
          <textarea name="description" value={product.description} onChange={handleChange} placeholder="Descripción" required className="w-full p-2 mb-3 border rounded"></textarea>
          <input type="number" name="price" value={product.price} onChange={handleChange} placeholder="Precio (LPS)" required className="w-full p-2 mb-3 border rounded" min="0.01" step="0.01"/>
          <input type="number" name="stock" value={product.stock} onChange={handleChange} placeholder="Cantidad en Stock" required className="w-full p-2 mb-3 border rounded" min="0"/>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
            <input type="date" name="expirationDate" value={product.expirationDate} onChange={handleChange} required className="w-full p-2 border rounded"/>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
            <input type="file" onChange={handleImageChange} accept="image/*" className="w-full p-2 border rounded"/>
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-primary rounded hover:bg-red-700 disabled:bg-red-300">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;