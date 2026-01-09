// src/App.jsx 
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices'
import CreateInvoice from './pages/CreateInvoice';
import NotFound from './pages/NotFound';
import Reports from './pages/Reports'
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Catalog from './pages/Catalog'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CursorTrail from './components/CursorTrail';

function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/catalogo" 
        element={
          <ProtectedRoute>
            <Layout>
              <Catalog />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventario" 
        element={
          <ProtectedRoute>
            <Layout>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clientes" 
        element={
          <ProtectedRoute>
            <Layout>
              <Clients />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/facturas"
        element={
          <ProtectedRoute>
            <Layout>
              <Invoices />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/facturas/crear"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateInvoice />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <CursorTrail />
    <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}

        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>

  );
}

export default App;