// src/components/AddPaymentModal.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { addPaymentToInvoice } from '../firebase/invoiceService';

const AddPaymentModal = ({ isOpen, onClose, invoice }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        if (paymentAmount <= 0 || paymentAmount > invoice.balanceDue) {
            toast.error(`El monto debe ser mayor a 0 y no mayor al saldo pendiente (L ${invoice.balanceDue.toFixed(2)})`);
            return;
        }
        setLoading(true);
        try {
            await addPaymentToInvoice(invoice, { amount: paymentAmount, paymentMethod, reference });
            toast.success('Abono registrado exitosamente!');
            onClose();
        } catch (error) {
            toast.error('Error al registrar el abono.');
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Registrar Abono a Factura {invoice.invoiceNumber}</h2>
                <p className="mb-1">Total Factura: <span className="font-bold">L {invoice.total.toFixed(2)}</span></p>
                <p className="mb-4">Saldo Pendiente: <span className="font-bold text-red-600">L {invoice.balanceDue.toFixed(2)}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto a abonar" required className="w-full p-2 border rounded" step="0.01" min="0.01" max={invoice.balanceDue} />
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
                        <option>Efectivo</option>
                        <option>Transferencia Bancaria</option>
                        <option>Tarjeta de Crédito/Débito</option>
                        <option>Otro</option>
                    </select>
                    <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia o nota (opcional)" className="w-full p-2 border rounded" />
                    <div className="flex justify-end gap-4"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Abono'}</button></div>
                </form>
            </div>
        </div>
    );
};
export default AddPaymentModal;