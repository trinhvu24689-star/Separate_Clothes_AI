import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Download, Trash2, PenTool, Palette, Lock, Zap, SprayCan, Square, Highlighter, Circle } from 'lucide-react';
import { Button } from './Button';
import { VipLevel } from '../types';

interface FreeDrawProps {
  vipLevel: VipLevel;
  onOpenShop: () => void;
}

type BrushType = 'round' | 'square' | 'spray' | 'marker' | 'neon';

const BRUSHES: { id: BrushType; name: string; icon: React.ReactNode }[] = [
  { id: 'round', name: 'Cọ Tròn', icon: <Circle size={16} /> },
  { id: 'square', name: 'Cọ Vuông', icon: <Square size={16} /> },
  { id: 'marker', name: 'Bút Dạ', icon: <Highlighter size={16} /> },
  { id: 'spray', name: 'Bình Xịt', icon: <SprayCan size={16} /> },
  { id: 'neon', name: 'Neon', icon: <Zap size={16} /> },
];

export const FreeDraw: React.FC<FreeDrawProps> = ({ vipLevel, onOpenShop }) => {
  // --- VIP CHECK ---
  const isLocked = vipLevel === 'NONE';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushType, setBrushType] = useState<BrushType>('round');
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize Canvas
  useEffect(() => {
    if (isLocked) return; // Don't init if locked

    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    // Set resolution based on container
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);
    }

    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
             const r = containerRef.current.getBoundingClientRect();
             const tempCanvas = document.createElement('canvas');
             tempCanvas.width = canvasRef.current.width;
             tempCanvas.height = canvasRef.current.height;
             const tempCtx = tempCanvas.getContext('2d');
             tempCtx?.drawImage(canvasRef.current, 0, 0);

             canvasRef.current.width = r.width;
             canvasRef.current.height = r.height;
             
             const newCtx = canvasRef.current.getContext('2d');
             if (newCtx) {
                 newCtx.drawImage(tempCanvas, 0, 0);
                 setCtx(newCtx);
             }
        }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLocked]);

  // Update Context Props based on Tool & Brush Type
  useEffect(() => {
    if (!ctx) return;

    // Reset basics
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    if (tool === 'eraser') {
       ctx.strokeStyle = '#0B0F19'; // Eraser matches bg
       ctx.fillStyle = '#0B0F19';
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
    } else {
       ctx.strokeStyle = color;
       ctx.fillStyle = color;

       // Apply Brush Type Settings
       switch (brushType) {
           case 'round':
               ctx.lineCap = 'round';
               ctx.lineJoin = 'round';
               break;
           case 'square':
               ctx.lineCap = 'butt';
               ctx.lineJoin = 'bevel';
               break;
           case 'marker':
               ctx.lineCap = 'round';
               ctx.lineJoin = 'round';
               ctx.globalAlpha = 0.5; // Semi-transparent
               break;
           case 'neon':
               ctx.lineCap = 'round';
               ctx.lineJoin = 'round';
               ctx.shadowBlur = 15;
               ctx.shadowColor = color;
               break;
           case 'spray':
               // Spray is handled manually in draw loop
               break;
       }
    }
    
    ctx.lineWidth = brushSize;
  }, [color, brushSize, tool, brushType, ctx]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ctx || !canvasRef.current) return;
    setIsDrawing(true);
    const pos = getPos(e);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // For single click dots (spray handles differently)
    if (tool !== 'eraser' && brushType === 'spray') {
        spray(pos.x, pos.y);
    } else {
        ctx.lineTo(pos.x, pos.y); // Draw start dot
        ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctx) return;
    e.preventDefault(); // Prevent scrolling on touch
    const pos = getPos(e);

    if (tool !== 'eraser' && brushType === 'spray') {
        spray(pos.x, pos.y);
    } else {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }
  };

  // Custom Spray Logic
  const spray = (x: number, y: number) => {
      if (!ctx) return;
      const density = Math.floor(brushSize * 1.5);
      const radius = brushSize;
      
      for (let i = 0; i < density; i++) {
          const offsetX = (Math.random() - 0.5) * 2 * radius;
          const offsetY = (Math.random() - 0.5) * 2 * radius;
          
          // Circular spray pattern
          if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
              ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
          }
      }
  };

  const stopDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveDrawing = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // --- LOCKED VIEW ---
  if (isLocked) {
    return (
        <div className="h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-[#131B2C] rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Lock className="w-24 h-24 text-yellow-500 mb-6 animate-pulse" />
                <h2 className="text-3xl font-black text-white mb-2">TÍNH NĂNG VIP</h2>
                <p className="text-gray-300 max-w-md mb-8">
                    Vẽ Tranh Tự Do chỉ dành cho thành viên <span className="text-yellow-500 font-bold">VIP</span> trở lên.
                </p>
                <Button onClick={onOpenShop} className="animate-bounce" icon={<Zap className="w-5 h-5"/>}>
                    Nâng Cấp Ngay
                </Button>
            </div>
        </div>
    );
  }

  // --- MAIN UI ---
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-[#131B2C] p-4 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        
        {/* Top Row: Tools & Color */}
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                {/* Color Picker */}
                <div className="relative group">
                    <input 
                    type="color" 
                    value={color}
                    onChange={(e) => {
                        setColor(e.target.value);
                        setTool('brush');
                    }}
                    className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-gray-600 shadow-lg"
                    />
                </div>

                {/* Main Tools */}
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button 
                        onClick={() => setTool('brush')}
                        className={`p-2 rounded-md transition-all ${tool === 'brush' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        title="Cọ vẽ"
                    >
                        <PenTool size={20} />
                    </button>
                    <button 
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-md transition-all ${tool === 'eraser' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        title="Tẩy"
                    >
                        <Eraser size={20} />
                    </button>
                </div>

                {/* Size Slider */}
                <div className="flex flex-col w-32">
                    <label className="text-[10px] text-gray-400 font-bold mb-1">Cỡ cọ: {brushSize}px</label>
                    <input 
                        type="range" 
                        min="1" 
                        max="80" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="accent-purple-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={clearCanvas}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/30"
                    title="Xóa tất cả"
                >
                    <Trash2 size={20} />
                </button>
                <Button onClick={saveDrawing} icon={<Download size={18} />} className="px-4 py-2 text-sm">
                    Lưu
                </Button>
            </div>
        </div>

        {/* Bottom Row: Brush Presets */}
        <div className="border-t border-gray-800 pt-4">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Loại Cọ</label>
            <div className="flex flex-wrap gap-2">
                {BRUSHES.map((b) => (
                    <button
                        key={b.id}
                        onClick={() => {
                            setBrushType(b.id);
                            setTool('brush');
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                            brushType === b.id && tool !== 'eraser'
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        {b.icon} {b.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#0B0F19] rounded-2xl border-2 border-dashed border-gray-800 overflow-hidden relative cursor-crosshair touch-none shadow-inner"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-10"
        />
        {!isDrawing && !ctx && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <Palette className="w-24 h-24 text-gray-600" />
           </div>
        )}
      </div>
    </div>
  );
};
