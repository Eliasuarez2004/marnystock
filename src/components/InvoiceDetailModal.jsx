// src/components/InvoiceDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { getInvoicePayments } from '../firebase/invoiceService';

const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        if (isOpen && invoice) {
            const unsubscribe = getInvoicePayments(invoice.id, setPayments);
            return () => unsubscribe();
        }
    }, [isOpen, invoice]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-full overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">Detalle de Factura {invoice.invoiceNumber}</h2>
                        <p className="text-gray-500">Cliente: {invoice.clientName}</p>
                        <p className="text-gray-500">Fecha: {invoice.issueDate}</p>
                    </div>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                {/* ... (resto del JSX abajo) ... */}
            </div>
        </div>
    );
};
export default InvoiceDetailModal;