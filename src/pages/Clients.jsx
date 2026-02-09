import React, { useState, useEffect } from 'react';
import ClientFormModal from '../components/ClientFormModal';
import { addClient, getClients, updateClient, deleteClient } from '../firebase/clientService';
import Swal from 'sweetalert2';
import AnimatedPage from '../components/AnimatedPage';
import { FiPlus, FiSearch, FiEdit2, FiTrash } from 'react-icons/fi';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = getClients((fetchedClients) => { setClients(fetchedClients); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.rtn.includes(searchTerm));

  const handleOpenModal = (client = null) => { setClientToEdit(client); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setClientToEdit(null); };
  const handleSaveClient = async (data) => { clientToEdit ? await updateClient(clientToEdit.id, data) : await addClient(data); };

  const handleDeleteClient = async (id, name) => {
    Swal.fire({
        title: '¿Eliminar Cliente?', text: `Se eliminará a "${name}".`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar',
        customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try { await deleteClient(id); Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false, customClass: { popup: 'rounded-2xl' }}); } 
            catch { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
        }
    });
  };

  return (
    <AnimatedPage>
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Clientes</h1>
            <p className="text-slate-500 font-medium">Directorio comercial</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-transform active:scale-95">
          <FiPlus size={20}/> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-sm">
                <FiSearch className="absolute left-3 top-3 text-slate-400"/>
                <input type="text" placeholder="Buscar por Nombre o RTN..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                <tr><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">RTN</th><th className="px-6 py-4">Contacto</th><th className="px-6 py-4 text-center">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">Cargando...</td></tr> : 
                filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                {client.name.substring(0,2).toUpperCase()}
                            </div>
                            <div className="font-medium text-slate-800">{client.name}</div>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{client.rtn || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-600">
                        <div className="text-xs">{client.email}</div>
                        <div className="text-xs text-slate-400">{client.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleOpenModal(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2/></button>
                            <button onClick={() => handleDeleteClient(client.id, client.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><FiTrash/></button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      </div>
      <ClientFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveClient} clientToEdit={clientToEdit} />
    </div>
  </AnimatedPage>
  );
};
export default Clients;