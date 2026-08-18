// src/components/CursorTrail.jsx
import React, { useState, useEffect } from 'react';

const CursorTrail = () => {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const handleMouseMove = ({ clientX, clientY }) => {
      setPoints(prevPoints => [...prevPoints.slice(-20), { x: clientX, y: clientY }]);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {points.map((point, index) => (
        <motion.div
          key={index}
          className="absolute w-2 h-2 bg-accent rounded-full pointer-events-none"
          style={{
            left: point.x - 4,
            top: point.y - 4,
            zIndex: 9999,
          }}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{
            duration: 0.8,
            delay: index * 0.02,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
};

export default CursorTrail;