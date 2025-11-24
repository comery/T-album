import React, { useState, useEffect, useRef } from 'react';
import { CardData } from '../types';
import { Calendar, GripVertical } from 'lucide-react';

interface PhotoCardProps {
  data: CardData;
  isSelected?: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onClick: (id: string) => void;
  isConnectionMode: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  data,
  isSelected,
  onMouseDown,
  onClick,
  isConnectionMode,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const typingIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!data.isTyping) {
      setDisplayedText(data.text);
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');

    if (typingIntervalRef.current) window.clearInterval(typingIntervalRef.current);

    typingIntervalRef.current = window.setInterval(() => {
      if (currentIndex < data.text.length) {
        setDisplayedText((prev) => prev + data.text.charAt(currentIndex));
        currentIndex++;
      } else {
        if (typingIntervalRef.current) window.clearInterval(typingIntervalRef.current);
      }
    }, 50);

    return () => {
      if (typingIntervalRef.current) window.clearInterval(typingIntervalRef.current);
    };
  }, [data.text, data.isTyping]);

  return (
    <div
      style={{
        transform: `translate(${data.x}px, ${data.y}px) rotate(${
          (data.id.charCodeAt(0) % 5) - 2
        }deg)`,
        position: 'absolute',
        width: '280px',
        zIndex: isSelected ? 50 : 10,
        cursor: isConnectionMode ? 'crosshair' : 'grab',
      }}
      className={`
        group flex flex-col bg-[#fffbf0] p-3 shadow-lg transition-shadow duration-200 select-none
        ${isSelected ? 'ring-4 ring-blue-400/50 shadow-2xl' : 'hover:shadow-xl'}
        border border-stone-200
      `}
      onMouseDown={(e) => onMouseDown(e, data.id)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(data.id);
      }}
    >
      {/* Tape effect at top */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-200/60 backdrop-blur-sm transform -rotate-1 shadow-sm border-l border-r border-white/30 pointer-events-none" />

      <div className="relative bg-stone-800 overflow-hidden border-4 border-white shadow-inner mb-3" style={{ aspectRatio: data.aspect === '16:9' ? '16 / 9' : data.aspect === '9:16' ? '9 / 16' : '1 / 1' }}>
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt="Memory"
            className="w-full h-full object-cover sepia-[.2] contrast-110 pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-500 pointer-events-none">
            <span className="text-xs">NO IMAGE</span>
          </div>
        )}
        {isConnectionMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 pointer-events-none">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping" />
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="font-['Special_Elite'] text-stone-800 leading-relaxed text-sm min-h-[3rem] pointer-events-none">
        {displayedText}
        {data.isTyping && displayedText.length < data.text.length && (
          <span className="inline-block w-2 h-4 bg-black ml-1 animate-pulse align-middle" />
        )}
      </div>

      {/* Footer: Date */}
      <div className="mt-3 pt-2 border-t border-stone-300 flex items-center justify-between text-stone-500 font-['VT323'] text-lg pointer-events-none">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{data.date}</span>
        </div>
        <div className={`opacity-0 ${!isConnectionMode && 'group-hover:opacity-100'} transition-opacity`}>
           <GripVertical size={16} />
        </div>
      </div>
    </div>
  );
};
