import React, { useState, useRef } from 'react';
import { Camera, Send, X, Upload } from 'lucide-react';

interface TypewriterMachineProps {
  onPrint: (text: string, date: string, imageFile: File | null) => void;
  onClose: () => void;
}

export const TypewriterMachine: React.FC<TypewriterMachineProps> = ({ onPrint, onClose }) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !imageFile) return;
    onPrint(text, date, imageFile);
    // Reset
    setText('');
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-stone-800 rounded-2xl p-1 shadow-2xl max-w-md w-full border-b-8 border-stone-900">
        {/* Device Casing Details */}
        <div className="absolute -top-2 left-4 w-20 h-1 bg-stone-600 rounded-full" />
        <div className="absolute top-4 right-4 flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>

        {/* Main Interface Body */}
        <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col gap-4 border-2 border-stone-700 h-full">
          
          {/* Header / Screen Label */}
          <div className="flex justify-between items-center text-stone-400 font-['VT323'] text-xl uppercase tracking-widest">
            <span>Motorola Fix-Beeper</span>
            <button onClick={onClose} className="hover:text-white"><X size={24} /></button>
          </div>

          {/* The Screen (Input Area) */}
          <div className="bg-[#9ea792] p-4 rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-4 border-[#8b947f] relative overflow-hidden">
             {/* Screen Grid Line Overlay */}
             <div className="absolute inset-0 pointer-events-none opacity-10" 
                  style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '4px 4px'}}>
             </div>
            
            {/* Image Preview in Screen */}
            {imagePreview && (
               <div className="mb-2 border-2 border-black/20 p-1 bg-black/5">
                  <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover grayscale opacity-80 mix-blend-multiply" />
                  <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="text-[10px] font-['VT323'] text-black underline mt-1"
                    >
                        CLEAR IMG
                    </button>
                  </div>
               </div>
            )}

            {/* Text Input */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="TYPE MESSAGE..."
              className="w-full bg-transparent border-none outline-none text-stone-900 font-['VT323'] text-2xl placeholder-stone-600/50 resize-none h-24"
              maxLength={140}
            />
            
            <div className="text-right text-xs font-['VT323'] text-stone-700 mt-1">
                {text.length}/140 CHARS
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Date Input styled as digital readout */}
            <div className="flex flex-col">
                <label className="text-[10px] text-stone-500 font-bold mb-1 uppercase tracking-wider">Date Stamp</label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-black text-green-400 font-['VT323'] text-xl p-2 rounded border border-stone-600 focus:border-green-500 outline-none uppercase"
                />
            </div>

             {/* Upload Button */}
             <div className="flex flex-col">
                <label className="text-[10px] text-stone-500 font-bold mb-1 uppercase tracking-wider">Image Source</label>
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-600 text-stone-300 font-['VT323'] text-xl p-2 rounded border border-stone-600 active:translate-y-0.5 transition-all"
                >
                    <Camera size={18} /> LOAD
                </button>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                />
             </div>
          </div>

          {/* Big Print Button */}
          <button
            onClick={handleSubmit}
            disabled={!text && !imageFile}
            className={`
                mt-2 group relative w-full h-14 flex items-center justify-center gap-3 
                font-['VT323'] text-3xl tracking-widest rounded shadow-lg transition-all
                ${(!text && !imageFile) ? 'bg-stone-600 text-stone-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-amber-950 active:top-1 active:shadow-none'}
            `}
          >
            <div className="absolute bottom-0 left-0 w-full h-full bg-black/20 rounded pointer-events-none" /> {/* Depth shade */}
            <span className="relative z-10 flex items-center gap-2">
                PRINT CARD <Send size={24} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

        </div>
        
        {/* Bottom decoration */}
        <div className="flex justify-center gap-4 mt-2 pb-2">
            <div className="w-16 h-1 bg-stone-700 rounded" />
            <div className="w-16 h-1 bg-stone-700 rounded" />
        </div>
      </div>
    </div>
  );
};