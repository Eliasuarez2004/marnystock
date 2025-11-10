// src/components/StatCard.jsx
import React from 'react';

const StatCard = ({ title, value, icon, colorClass = 'bg-blue-500' }) => {
    const IconComponent = icon; // Asignar el componente de icono a una variable
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-full text-white ${colorClass}`}>
                <IconComponent size={28} />
            </div>
            <div className="ml-4">
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-secondary">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;