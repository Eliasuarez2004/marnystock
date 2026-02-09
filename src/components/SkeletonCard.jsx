import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="w-full h-48 bg-slate-200 animate-pulse"></div>
      <div className="p-5 space-y-3">
        <div className="h-6 w-3/4 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="h-4 w-full bg-slate-100 rounded-lg animate-pulse"></div>
        <div className="h-4 w-2/3 bg-slate-100 rounded-lg animate-pulse"></div>
        <div className="pt-4 mt-4 border-t border-slate-50 flex justify-between items-center">
            <div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="flex gap-2">
                <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;