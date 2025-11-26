import React from 'react';
import { Download, Trash2, Maximize2 } from 'lucide-react';
import { Design } from '../types';

interface DesignGalleryProps {
  designs: Design[];
  onDelete: (id: string) => void;
}

export const DesignGallery: React.FC<DesignGalleryProps> = ({ designs, onDelete }) => {
  const handleDownload = (design: Design) => {
    const link = document.createElement('a');
    link.href = design.imageUrl;
    link.download = `merchghost-${design.id}-${design.style.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
        <Maximize2 className="h-8 w-8 mb-3 opacity-50" />
        <p>No designs generated yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {designs.map((design) => (
        <div key={design.id} className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-indigo-500/50 transition-all">
          <img 
            src={design.imageUrl} 
            alt={design.prompt} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
            <p className="text-xs text-white line-clamp-2 mb-2 font-medium">{design.prompt}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleDownload(design)}
                className="flex-1 bg-white text-black text-xs font-bold py-1.5 rounded hover:bg-zinc-200 flex items-center justify-center gap-1"
              >
                <Download className="h-3 w-3" /> Save
              </button>
              <button 
                onClick={() => onDelete(design.id)}
                className="bg-red-500/20 text-red-400 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Style Badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-medium uppercase tracking-wider">
            {design.style}
          </div>
        </div>
      ))}
    </div>
  );
};
