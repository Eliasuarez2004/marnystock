// src/pages/Clients.jsx (actualizado)
import React, { useState, useEffect } from 'react';
import ClientFormModal from '../components/ClientFormModal';
import { addClient, getClients, updateClient, deleteClient } from '../firebase/clientService';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getClients((fetchedClients) => {
      setClients(fetchedClients);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (client = null) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setClientToEdit(null);
  };

  const handleSaveClient = async (clientData) => {
    if (clientToEdit) {
      await updateClient(clientToEdit.id, clientData);
    } else {
      await addClient(clientData);
    }
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${clientName}"?`)) {
      try {
        await deleteClient(clientId);
      } catch (error) {
        console.error("Error al eliminar el cliente:", error);
        alert("No se pudo eliminar el cliente.");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary">Gestión de Clientes</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-red-700 transition-colors"
        >
          + Nuevo Cliente
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        {loading ? (
          <p>Cargando clientes...</p>
        ) : (
          <table className="w-full table-auto">
            <thead className="text-left bg-gray-100">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Email</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{client.name}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">{client.phone}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleOpenModal(client)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      Editar
                    </button>
                    <button onClick={() => handleDeleteClient(client.id, client.name)} className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveClient}
        clientToEdit={clientToEdit}
      />
    </div>
  );
};

export default Clients;