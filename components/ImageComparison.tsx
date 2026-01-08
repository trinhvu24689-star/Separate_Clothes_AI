import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({ beforeImage, afterImage }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPos);
  }, []);

  const onMouseDown = () => setIsDragging(true);
  const onTouchStart = () => setIsDragging(true);

  // Allow clicking anywhere on the container to jump to that position
  const onContainerClick = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  useEffect(() => {
    const onMouseUp = () => setIsDragging(false);
    const onTouchEnd = () => setIsDragging(false);
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection
        handleMove(e.clientX);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        // e.preventDefault(); // Often needed for touch dragging, but might block scroll
        handleMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isDragging, handleMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden cursor-crosshair group rounded-xl"
      onMouseDown={onContainerClick}
    >
      {/* Background (After/Result) */}
      <img 
        src={afterImage} 
        alt="Processed" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      {/* Foreground (Before/Original) - Clipped */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ 
          clipPath: `inset(0 ${100 - position}% 0 0)` 
        }}
      >
        <img 
          src={beforeImage} 
          alt="Original" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" 
          draggable={false}
        />
        {/* Label for Before */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-md text-xs font-bold border border-white/20 shadow-lg">
          Original
        </div>
      </div>

       {/* Label for After (Positioned on the right side, visible when slider is to the left) */}
       <div className="absolute top-4 right-4 bg-purple-600/80 backdrop-blur-md text-white px-2 py-1 rounded-md text-xs font-bold border border-purple-500/30 shadow-lg z-0">
          Result
        </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:bg-purple-200 transition-colors"
        style={{ left: `${position}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl text-purple-600 hover:scale-110 transition-transform">
           <GripVertical size={18} />
        </div>
      </div>
    </div>
  );
};
