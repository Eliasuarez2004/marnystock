// src/components/AnimatedBackground.jsx
import React from 'react';

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
      {/* Capa de Partículas Estelares */}
      <div id="stars-container" className="absolute inset-0">
        <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div>
      </div>
      {/* Capa de Aurora Reactiva al Mouse */}
      <div className="aurora-background" />
    </div>
  );
};

export default AnimatedBackground;