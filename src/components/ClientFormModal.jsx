// src/components/ClientFormModal.jsx
import React, { useState, useEffect } from 'react';

const ClientFormModal = ({ isOpen, onClose, onSave, clientToEdit }) => {
  const [client, setClient] = useState({
    name: '',
    rtn: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setClient({
        name: clientToEdit.name || '',
        rtn: clientToEdit.rtn || '', // Asegura que rtn sea siempre un string
        email: clientToEdit.email || '',
        phone: clientToEdit.phone || '',
        address: clientToEdit.address || '',
      });
    } else {
      setClient({ name: '', rtn: '', email: '', phone: '', address: '' });
    }
}, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(client);
      onClose();
    } catch (err) {
      console.error("Error saving client:", err);
      alert("No se pudo guardar el cliente.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-secondary mb-4">
          {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" value={client.name} onChange={handleChange} placeholder="Nombre Completo" required className="w-full p-2 mb-3 border rounded"/>
          <input type="text" name="rtn" value={client.rtn} onChange={handleChange} placeholder="RTN (opcional)" className="w-full p-2 mb-3 border rounded"/>
          <input type="email" name="email" value={client.email} onChange={handleChange} placeholder="Correo Electrónico" required className="w-full p-2 mb-3 border rounded"/>
          <input type="tel" name="phone" value={client.phone} onChange={handleChange} placeholder="Teléfono" required className="w-full p-2 mb-3 border rounded"/>
          <textarea name="address" value={client.address} onChange={handleChange} placeholder="Dirección" required className="w-full p-2 mb-4 border rounded"></textarea>
          
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

export default ClientFormModal;