// src/components/ProductCard.jsx
import React from 'react';

const ProductCard = ({ product, onEdit, onDelete }) => {
  const isLowStock = product.stock < 10; // Lógica para stock bajo
  
  // Lógica para vencimiento (simple)
  const expirationDate = new Date(product.expirationDate);
  const today = new Date();
  const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  const isExpired = daysUntilExpiration <= 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
      <img 
        src={product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Imagen'} 
        alt={product.name} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-bold text-secondary">{product.name}</h3>
        <p className="text-gray-600 mt-1 text-sm truncate">{product.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold text-primary">LPS {parseFloat(product.price).toFixed(2)}</span>
          <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-green-600'}`}>
            Stock: {product.stock}
          </span>
        </div>
         <div className="mt-2 text-sm">
            {isExpired ? (
                <p className="text-red-600 font-semibold">Vencido</p>
            ) : isExpiringSoon ? (
                <p className="text-yellow-600 font-semibold">Vence pronto: {product.expirationDate}</p>
            ) : (
                <p className="text-gray-500">Vence: {product.expirationDate}</p>
            )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => onEdit(product)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Editar</button>
          <button onClick={() => onDelete(product)} className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Borrar</button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;