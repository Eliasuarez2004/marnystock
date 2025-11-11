// src/components/SkeletonCard.jsx
import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-300"></div>
      <div className="p-4">
        <div className="h-6 w-3/4 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
        <div className="flex justify-between items-center mt-4">
          <div className="h-6 w-1/4 bg-gray-300 rounded"></div>
          <div className="h-6 w-1/4 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;