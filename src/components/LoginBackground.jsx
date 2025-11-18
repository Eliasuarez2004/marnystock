// src/components/LoginBackground.jsx
import React from 'react';

const LoginBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-secondary">
      <svg
        className="absolute bottom-0 left-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="Gradient1" cx="50%" cy="50%" r="50%" fx="25%" fy="25%">
            <stop offset="0%" stopColor="rgba(204, 0, 51, 0.3)" />
            <stop offset="100%" stopColor="rgba(204, 0, 51, 0)" />
          </radialGradient>
          <radialGradient id="Gradient2" cx="50%" cy="50%" r="50%" fx="75%" fy="75%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#Gradient1)">
          <animate
            attributeName="x"
            dur="20s"
            values="-100%;100%;-100%"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y"
            dur="21s"
            values="-100%;100%;-100%"
            repeatCount="indefinite"
          />
        </rect>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#Gradient2)">
           <animate
            attributeName="x"
            dur="22s"
            values="100%;-100%;100%"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y"
            dur="23s"
            values="100%;-100%;100%"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
    </div>
  );
};

export default LoginBackground;