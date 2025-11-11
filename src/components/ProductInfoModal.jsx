// src/components/ProductInfoModal.jsx (SIMPLIFICADO)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const ProductInfoModal = ({ isOpen, onClose, onSave, productToEdit }) => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        name: productToEdit.name || '',
        description: productToEdit.description || '',
        price: productToEdit.price || '',
      });
    } else {
      setProduct({ name: '', description: '', price: '' });
    }
    setImageFile(null);
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
    try {
        await onSave(product, imageFile);
        toast.success('Información del producto guardada!');
        onClose();
    } catch (err) {
        toast.error('No se pudo guardar la información.');
        console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-secondary mb-4">
          {productToEdit ? 'Editar Información del Producto' : 'Nuevo Tipo de Producto'}
        </h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Nombre del Producto" required className="w-full p-2 mb-3 border rounded"/>
          <textarea name="description" value={product.description} onChange={handleChange} placeholder="Descripción" required className="w-full p-2 mb-3 border rounded"></textarea>
          <input type="number" name="price" value={product.price} onChange={handleChange} placeholder="Precio de Venta Sugerido (LPS)" required className="w-full p-2 mb-3 border rounded" min="0.01" step="0.01"/>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
            <input type="file" onChange={handleImageChange} accept="image/*" className="w-full p-2 border rounded"/>
          </div>
          
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

export default ProductInfoModal;