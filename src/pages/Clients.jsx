// src/pages/Clients.jsx (actualizado)
import React, { useState, useEffect } from 'react';
import ClientFormModal from '../components/ClientFormModal';
import { addClient, getClients, updateClient, deleteClient } from '../firebase/clientService';
import Swal from 'sweetalert2';
import AnimatedPage from '../components/AnimatedPage';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = getClients((fetchedClients) => {
      setClients(fetchedClients);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.rtn.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
    Swal.fire({ // REEMPLAZADO
        title: '¿Estás seguro?',
        text: `No podrás revertir la eliminación de "${clientName}"!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#CC0033',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteClient(clientId);
                Swal.fire('Eliminado!', 'El cliente ha sido eliminado.', 'success');
            } catch (error) {
                console.error("Error al eliminar el cliente:", error);
                Swal.fire('Error!', 'No se pudo eliminar el cliente.', 'error');
            }
        }
    });
};

  return (
    <AnimatedPage>
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

      {/* Barra de Búsqueda */}
            <div className="mb-4">
                <input 
                    type="text"
                    placeholder="Buscar por Nombre, RTN o Email..."
                    className="w-full p-2 border rounded-md"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        {loading ? (
          <p>Cargando clientes...</p>
        ) : (
          <table className="w-full table-auto">
            <thead className="text-left bg-gray-100">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">RTN</th>
                <th className="p-3">Email</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{client.name}</td>
                  <td className="p-3 font-mono">{client.rtn || 'N/A'}</td>
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
  </AnimatedPage>
  );
};

export default Clients;