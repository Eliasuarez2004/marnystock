import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiX, FiSave, FiUploadCloud } from 'react-icons/fi';

const ProductInfoModal = ({ isOpen, onClose, onSave, productToEdit }) => {
  const [product, setProduct] = useState({ name: '', description: '', price: '' });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) setProduct({ name: productToEdit.name, description: productToEdit.description, price: productToEdit.price });
    else setProduct({ name: '', description: '', price: '' });
    setImageFile(null);
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await onSave(product, imageFile); toast.success('Producto guardado'); onClose(); } 
    catch { toast.error('Error al guardar'); }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{productToEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <button onClick={onClose}><FiX className="text-slate-400 hover:text-slate-600" size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre Producto</label><input type="text" value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" required/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Descripción</label><textarea value={product.description} onChange={e=>setProduct({...product, description:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none h-20" required/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Precio (LPS)</label><input type="number" step="0.01" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono" required/></div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input type="file" onChange={e=>setImageFile(e.target.files[0])} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                <FiUploadCloud size={32} className="mx-auto text-blue-500 mb-2"/>
                <p className="text-sm font-medium text-slate-600">{imageFile ? imageFile.name : 'Subir imagen del producto'}</p>
                <p className="text-xs text-slate-400">PNG, JPG hasta 5MB</p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4">
                {loading ? '...' : <><FiSave/> Guardar Cambios</>}
            </button>
        </form>
      </motion.div>
    </div>
  );
};
export default ProductInfoModal;