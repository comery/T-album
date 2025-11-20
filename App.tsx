import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Link2, Trash2, RotateCcw, Download, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { PhotoCard } from './components/PhotoCard';
import { TypewriterMachine } from './components/TypewriterMachine';
import { CardData, Connection, DragState, InteractionMode } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Background pattern for the table
const BACKGROUND_STYLE = {
  backgroundImage: `
    radial-gradient(#d6d3d1 1px, transparent 1px),
    linear-gradient(to right, #e7e5e4 1px, transparent 1px),
    linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
  `,
  backgroundSize: '20px 20px, 100px 100px, 100px 100px',
  backgroundColor: '#f5f5f4',
};

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

// Safe ID generator
const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const App: React.FC = () => {
  // State
  const [cards, setCards] = useState<CardData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(true); // Start open
  const [mode, setMode] = useState<InteractionMode>('idle');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // Viewport State (Zoom & Pan)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Dragging State for Cards
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    cardId: null,
    offset: { x: 0, y: 0 }, // Offset is now relative to the card's origin in world space
  });

  // Refs for canvas interaction
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- Actions ---

  const addCard = (text: string, date: string, imageFile: File | null) => {
    const id = generateId();
    
    // Place card in the center of the current viewport
    // Screen Center -> World Coordinates
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    const worldX = (screenCenterX - viewport.x) / viewport.scale - 140; // -140 to center the 280px card
    const worldY = (screenCenterY - viewport.y) / viewport.scale - 150;

    // Add a little randomness so they don't stack perfectly
    const jitterX = Math.random() * 40 - 20;
    const jitterY = Math.random() * 40 - 20;

    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : '';

    const newCard: CardData = {
      id,
      x: worldX + jitterX,
      y: worldY + jitterY,
      imageUrl,
      text,
      date,
      isTyping: true,
    };

    setCards((prev) => [...prev, newCard]);
    setIsComposerOpen(false);

    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isTyping: false } : c))
      );
    }, Math.max(2000, text.length * 50 + 500));
  };

  const handleCardClick = useCallback((id: string) => {
    if (mode === 'connecting') {
      if (selectedCardId === null) {
        // Select first card
        setSelectedCardId(id);
      } else if (selectedCardId === id) {
        // Deselect if clicking the same card
        setSelectedCardId(null);
      } else {
        // Connect two different cards
        const fromId = selectedCardId;
        const toId = id;

        // Check if connection already exists
        const exists = connections.some(
          (c) =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );

        if (exists) {
           // Remove existing connection
           setConnections((prev) => 
              prev.filter(c => !((c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)))
           );
        } else {
          // Create new connection
          const newConn: Connection = { 
            id: generateId(), 
            fromId: fromId,
            toId: toId 
          };
          setConnections((prev) => [...prev, newConn]);
        }
        // Reset selection after linking action
        setSelectedCardId(null);
      }
    } else {
      // In idle mode, just select
      setSelectedCardId(id);
    }
  }, [mode, connections, selectedCardId]);

  const deleteSelected = () => {
    if (selectedCardId) {
      setConnections(prev => prev.filter(c => c.fromId !== selectedCardId && c.toId !== selectedCardId));
      setCards(prev => prev.filter(c => c.id !== selectedCardId));
      setSelectedCardId(null);
    }
  };

  const clearAll = () => {
    if (confirm("Clear all memories?")) {
      setCards([]);
      setConnections([]);
      setSelectedCardId(null);
      setViewport({ x: 0, y: 0, scale: 1 });
    }
  };

  // --- Zoom & Pan Logic ---

  const handleWheel = (e: React.WheelEvent) => {
    if (isComposerOpen) return;
    
    const zoomIntensity = 0.001;
    const delta = -e.deltaY * zoomIntensity;
    const newScale = Math.min(Math.max(0.1, viewport.scale + delta), 3);

    // Zoom towards cursor
    const mouseX = e.clientX - viewport.x;
    const mouseY = e.clientY - viewport.y;

    const scaleRatio = newScale / viewport.scale;
    const newX = e.clientX - (mouseX * scaleRatio);
    const newY = e.clientY - (mouseY * scaleRatio);

    setViewport({
      x: newX,
      y: newY,
      scale: newScale,
    });
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // If clicking on a card or button, don't pan
    if (target.closest('.card-element') || target.closest('button')) {
        return;
    }

    // Start Panning
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Logic: Only deselect if it was a click (not a drag)
    if (dragStartPos.current) {
        const dist = Math.sqrt(
            Math.pow(e.clientX - dragStartPos.current.x, 2) + 
            Math.pow(e.clientY - dragStartPos.current.y, 2)
        );
        
        // If moved less than 5px, treat as a background click
        if (dist < 5) {
             // In connecting mode, dragging background shouldn't deselect card immediately if we panned,
             // but a pure click should.
             setSelectedCardId(null);
        }
    }
    dragStartPos.current = null;
  };

  // --- Card Drag Logic ---

  const handleCardMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent panning
    if (mode === 'connecting') {
        // In connecting mode, we don't drag cards.
        return;
    }
    
    const card = cards.find((c) => c.id === id);
    if (card) {
      const mouseWorldX = (e.clientX - viewport.x) / viewport.scale;
      const mouseWorldY = (e.clientY - viewport.y) / viewport.scale;

      setDragState({
        isDragging: true,
        cardId: id,
        offset: {
          x: mouseWorldX - card.x,
          y: mouseWorldY - card.y,
        },
      });
      setSelectedCardId(id);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // 1. Handle Panning
    if (isPanning && lastMousePos.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
    }

    // 2. Handle Card Dragging
    if (dragState.isDragging && dragState.cardId) {
      const mouseWorldX = (e.clientX - viewport.x) / viewport.scale;
      const mouseWorldY = (e.clientY - viewport.y) / viewport.scale;

      const newX = mouseWorldX - dragState.offset.x;
      const newY = mouseWorldY - dragState.offset.y;

      setCards((prev) =>
        prev.map((c) =>
          c.id === dragState.cardId ? { ...c, x: newX, y: newY } : c
        )
      );
    }
  }, [dragState, isPanning, viewport]);

  const handleMouseUp = useCallback(() => {
    setDragState({ isDragging: false, cardId: null, offset: { x: 0, y: 0 } });
    setIsPanning(false);
    lastMousePos.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  // --- Helper Functions ---

  const getPath = (conn: Connection) => {
    const from = cards.find((c) => c.id === conn.fromId);
    const to = cards.find((c) => c.id === conn.toId);
    if (!from || !to) return '';
    const cardW = 280;
    // Anchor points roughly at the center-ish area
    const fromX = from.x + cardW / 2;
    const fromY = from.y + 100; 
    const toX = to.x + cardW / 2;
    const toY = to.y + 100;
    
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const dist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    // Add a nice curve that hangs down a bit
    const droop = Math.min(150, dist * 0.25);
    
    return `M ${fromX} ${fromY} Q ${midX} ${midY + droop} ${toX} ${toY}`;
  };

  const handleResetView = () => {
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  const handleZoomIn = () => {
    setViewport(prev => ({
        ...prev,
        scale: Math.min(prev.scale + 0.2, 3),
        x: prev.x - (window.innerWidth * 0.1),
        y: prev.y - (window.innerHeight * 0.1)
    }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({
        ...prev,
        scale: Math.max(prev.scale - 0.2, 0.1),
        x: prev.x + (window.innerWidth * 0.1),
        y: prev.y + (window.innerHeight * 0.1)
    }));
  };

  const exportToPDF = async () => {
    if (cards.length === 0) {
        alert("Nothing to print! Add some memories first.");
        return;
    }

    const loadingId = window.setTimeout(() => document.body.style.cursor = 'wait', 0);

    try {
        // 1. Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        cards.forEach(card => {
            minX = Math.min(minX, card.x);
            minY = Math.min(minY, card.y);
            maxX = Math.max(maxX, card.x + 280);
            maxY = Math.max(maxY, card.y + 350);
        });

        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;

        // 2. Temporarily reset viewport to snapshot
        const originalViewport = { ...viewport };
        setViewport({ x: -minX, y: -minY, scale: 1 });
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 200));

        if (contentRef.current) {
            const canvas = await html2canvas(contentRef.current, {
                backgroundColor: '#f5f5f4',
                width: totalWidth,
                height: totalHeight,
                x: 0,
                y: 0,
                scale: 2,
                useCORS: true,
                logging: false,
                ignoreElements: (element) => element.tagName === 'BUTTON'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: totalWidth > totalHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [totalWidth, totalHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, totalWidth, totalHeight);
            pdf.save('travel-memories-log.pdf');
        }

        // 3. Restore Viewport
        setViewport(originalViewport);

    } catch (error) {
        console.error("Export failed", error);
        alert("Failed to generate PDF.");
    } finally {
        window.clearTimeout(loadingId);
        document.body.style.cursor = 'default';
    }
  };

  return (
    <div 
        ref={containerRef}
        className={`relative w-screen h-screen overflow-hidden ${mode === 'connecting' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
            ...BACKGROUND_STYLE,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`, 
            backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}, ${100 * viewport.scale}px ${100 * viewport.scale}, ${100 * viewport.scale}px ${100 * viewport.scale}`
        }}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        onClick={handleContainerClick}
    >
      
      {/* --- World Container --- */}
      <div 
        ref={contentRef}
        style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
        }}
      >
          {/* Connection Lines - Rendered BEHIND cards */}
          {/* Using w-full h-full to ensure it covers the potentially infinite canvas area visible */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" 
            style={{ overflow: 'visible' }}
          >
            {connections.map((conn) => (
                <g key={conn.id}>
                    <path
                        d={getPath(conn)}
                        fill="none"
                        stroke="#44403c"
                        strokeWidth="3"
                        strokeDasharray="12 6"
                        strokeLinecap="round"
                        className="opacity-70"
                    />
                    {/* Optional: Add circles at endpoints to make connections clearer */}
                </g>
            ))}
          </svg>

          {/* Cards */}
          {cards.map((card) => (
            <div key={card.id} className="card-element absolute" style={{ left: 0, top: 0 }}> 
                <PhotoCard
                    data={card}
                    isSelected={selectedCardId === card.id}
                    onMouseDown={handleCardMouseDown}
                    onClick={handleCardClick}
                    isConnectionMode={mode === 'connecting'}
                />
            </div>
          ))}
      </div>

      {/* --- UI Overlays --- */}
      <div 
        className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-3 flex items-center gap-6 border border-stone-200 z-40 transition-transform"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button onClick={() => setIsComposerOpen(true)} className="flex flex-col items-center gap-1 text-stone-600 hover:text-amber-600 transition-colors group">
          <div className="p-2 bg-stone-100 rounded-full group-hover:bg-amber-100 transition-colors"><Plus size={20} /></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">New</span>
        </button>
        <div className="w-px h-8 bg-stone-300" />
        <button 
            onClick={() => { setMode(mode === 'idle' ? 'connecting' : 'idle'); setSelectedCardId(null); }} 
            className={`flex flex-col items-center gap-1 transition-colors group ${mode === 'connecting' ? 'text-blue-600' : 'text-stone-600 hover:text-blue-600'}`}
        >
          <div className={`p-2 rounded-full transition-colors ${mode === 'connecting' ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-stone-100 group-hover:bg-blue-50'}`}><Link2 size={20} /></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Link</span>
        </button>
        <button onClick={deleteSelected} disabled={!selectedCardId} className={`flex flex-col items-center gap-1 transition-colors group ${!selectedCardId ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:text-red-600'}`}>
          <div className={`p-2 rounded-full transition-colors ${!selectedCardId ? 'bg-stone-50' : 'bg-stone-100 group-hover:bg-red-50'}`}><Trash2 size={20} /></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Trash</span>
        </button>
        <div className="w-px h-8 bg-stone-300" />
        <button onClick={exportToPDF} className="flex flex-col items-center gap-1 text-stone-600 hover:text-green-700 transition-colors group">
            <div className="p-2 bg-stone-100 rounded-full group-hover:bg-green-100 transition-colors"><Download size={20} /></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
        </button>
        <div className="w-px h-8 bg-stone-300" />
        <button onClick={clearAll} className="flex flex-col items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors group">
            <div className="p-2 bg-stone-100 rounded-full group-hover:bg-stone-200 transition-colors"><RotateCcw size={20} /></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2" onMouseDown={(e) => e.stopPropagation()}>
         <div className="bg-white/90 backdrop-blur p-1 rounded-lg shadow border border-stone-200 flex flex-col gap-1">
            <button onClick={handleZoomIn} className="p-2 hover:bg-stone-100 rounded text-stone-600"><ZoomIn size={20}/></button>
            <button onClick={handleResetView} className="p-2 hover:bg-stone-100 rounded text-stone-600"><Maximize size={20}/></button>
            <button onClick={handleZoomOut} className="p-2 hover:bg-stone-100 rounded text-stone-600"><ZoomOut size={20}/></button>
         </div>
      </div>

      {/* Status */}
      <div className="absolute bottom-6 left-6 pointer-events-none select-none z-40">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow text-stone-500 text-sm font-['VT323'] mb-2">
            {mode === 'connecting' ? (
                <span className="text-blue-600 animate-pulse font-bold">CONNECT MODE: CLICK TWO CARDS</span>
            ) : (
                <span>DRAG TO PAN • WHEEL TO ZOOM</span>
            )}
        </div>
        <h1 className="font-['Special_Elite'] text-2xl text-stone-800 opacity-40">Travel Log_</h1>
      </div>

      {isComposerOpen && (
        <TypewriterMachine
          onPrint={addCard}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </div>
  );
};

export default App;