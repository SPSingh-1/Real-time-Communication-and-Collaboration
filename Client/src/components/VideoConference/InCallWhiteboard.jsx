// src/components/VideoConference/InCallWhiteboard.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Eraser,
  Trash2,
  Download,
  X,
  Palette,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
  Highlighter
} from 'lucide-react';

const COLORS = [
  '#ffffff', // White
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4'  // Cyan
];

const InCallWhiteboard = ({ isOpen, onClose, socket, roomId, currentUser, openedBy }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resize canvas according to container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Preserve existing content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - 60; // Subtract header height

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.drawImage(tempCanvas, 0, 0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(resizeCanvas, 100);
      window.addEventListener('resize', resizeCanvas);
    }
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isOpen, resizeCanvas]);

  // Helper to render a stroke on canvas
  const renderLine = useCallback((ctx, canvas, lineData) => {
    if (!ctx || !canvas || !lineData) return;
    const { prevX, prevY, currX, currY, color: remoteColor, lineWidth: remoteWidth, tool: remoteTool } = lineData;

    ctx.beginPath();
    ctx.moveTo(prevX * canvas.width, prevY * canvas.height);
    ctx.lineTo(currX * canvas.width, currY * canvas.height);

    if (remoteTool === 'eraser') {
      ctx.strokeStyle = '#0f172a'; // canvas dark bg
      ctx.lineWidth = (remoteWidth || 3) * 3;
      ctx.globalAlpha = 1.0;
    } else if (remoteTool === 'highlighter') {
      ctx.strokeStyle = remoteColor || '#3b82f6';
      ctx.lineWidth = (remoteWidth || 3) * 2.5;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.strokeStyle = remoteColor || '#3b82f6';
      ctx.lineWidth = remoteWidth || 3;
      ctx.globalAlpha = 1.0;
    }

    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1.0;
  }, []);

  // Handle incoming drawing broadcasts & whiteboard history from room
  useEffect(() => {
    if (!socket || !isOpen) return;

    // Request full whiteboard history for room
    if (roomId) {
      socket.emit('request-whiteboard-history', { roomId });
    }

    const handleWhiteboardHistory = ({ lines }) => {
      const canvas = canvasRef.current;
      if (!canvas || !Array.isArray(lines) || lines.length === 0) return;
      const ctx = canvas.getContext('2d');
      lines.forEach((l) => renderLine(ctx, canvas, l));
    };

    const handleDrawLine = (lineData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      renderLine(ctx, canvas, lineData);
    };

    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('whiteboard-history', handleWhiteboardHistory);
    socket.on('whiteboard-draw-line', handleDrawLine);
    socket.on('whiteboard-clear', handleClearCanvas);

    return () => {
      socket.off('whiteboard-history', handleWhiteboardHistory);
      socket.off('whiteboard-draw-line', handleDrawLine);
      socket.off('whiteboard-clear', handleClearCanvas);
    };
  }, [socket, isOpen, roomId, renderLine]);

  const lastPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    lastPosRef.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const currX = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const currY = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const prevX = lastPosRef.current.x;
    const prevY = lastPosRef.current.y;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = lineWidth * 3;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 2.5;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1.0;
    }

    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1.0;

    // Emit line data normalized to 0-1 for responsive peer rendering
    if (socket && roomId) {
      socket.emit('whiteboard-draw-line', {
        roomId,
        lineData: {
          prevX: prevX / canvas.width,
          prevY: prevY / canvas.height,
          currX: currX / canvas.width,
          currY: currY / canvas.height,
          color,
          lineWidth,
          tool
        }
      });
    }

    lastPosRef.current = { x: currX, y: currY };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (socket && roomId) {
      socket.emit('whiteboard-clear', { roomId });
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create temp canvas with dark background
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = canvas.width;
    saveCanvas.height = canvas.height;
    const saveCtx = saveCanvas.getContext('2d');

    saveCtx.fillStyle = '#0f172a';
    saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
    saveCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `meeting-whiteboard-${Date.now()}.png`;
    link.href = saveCanvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'inset-2 md:inset-6'
          : 'bottom-20 right-4 w-[92vw] sm:w-[650px] h-[520px] max-h-[85vh]'
      }`}
      ref={containerRef}
    >
      {/* WHITEBOARD HEADER & TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950 border-b border-slate-800 text-white select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold leading-none text-white">Collaborative Whiteboard</h3>
              {openedBy && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-semibold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Opened by <span className="text-white font-bold">{openedBy?.name || 'Teammate'}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time live drawing synchronized with team</p>
          </div>
        </div>

        {/* DRAWING TOOLS */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tool Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Pen / Brush"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('highlighter')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                tool === 'highlighter' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Highlighter"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Palette (Active only when not erasing) */}
          {tool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-blue-400' : 'hover:scale-110 opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300">
            <span className="text-[10px] text-slate-400 hidden sm:inline">Size:</span>
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                  lineWidth === w ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Clear Board */}
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-red-400 border border-slate-800 transition-colors"
            title="Clear Whiteboard"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Download Image */}
          <button
            onClick={downloadCanvas}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Download as PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(resizeCanvas, 150);
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Close Whiteboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CANVAS CONTAINER */}
      <div className="flex-1 bg-slate-900 relative cursor-crosshair overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};

export default InCallWhiteboard;
