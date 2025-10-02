import React from 'react';
import type { GeneratedImageInfo } from '../types';
import ImageCard from './ImageCard';
import { ImageIcon, ExportIcon } from './icons';

interface ImageGalleryProps {
  images: GeneratedImageInfo[];
  onExportAllZip: (format: 'jpeg' | 'webp') => void;
  onExportPdf: () => void;
  isExporting: boolean;
  onRegenerate: (id: string) => void;
  onRemoveBg: (id: string) => void;
  onAnimate: (id: string) => void;
  onRefineRequest: (image: GeneratedImageInfo) => void;
}

const ExportAllButton: React.FC<{ onExportAllZip: (format: 'jpeg' | 'webp') => void; onExportPdf: () => void; disabled: boolean }> = ({ onExportAllZip, onExportPdf, disabled }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const handleAction = (action: () => void) => {
      action();
      setIsOpen(false);
    }

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                    className="flex items-center justify-center bg-brand-gray-700 hover:bg-brand-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out disabled:bg-brand-gray-800 disabled:text-brand-gray-600 disabled:cursor-not-allowed"
                >
                    <ExportIcon className="mr-2 h-5 w-5" />
                    Export All
                </button>
            </div>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-brand-gray-800 ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <a href="#" onClick={(e) => { e.preventDefault(); handleAction(() => onExportAllZip('jpeg')); }} className="block px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700" role="menuitem">Download as JPGs (.zip)</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleAction(() => onExportAllZip('webp')); }} className="block px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700" role="menuitem">Download as WebPs (.zip)</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleAction(onExportPdf); }} className="block px-4 py-2 text-sm text-brand-gray-200 hover:bg-brand-gray-700" role="menuitem">Export as PDF</a>
                    </div>
                </div>
            )}
        </div>
    );
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onExportAllZip, onExportPdf, isExporting, onRegenerate, onRemoveBg, onAnimate, onRefineRequest }) => {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-gray-800/50 border-2 border-dashed border-brand-gray-700 rounded-2xl p-8">
        <ImageIcon className="w-24 h-24 text-brand-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-brand-gray-300">Your gallery awaits</h2>
        <p className="text-brand-gray-600 mt-2">Enter your prompts and click "Generate" to start creating.</p>
      </div>
    );
  }

  const canExportAll = images.some(img => img.status === 'success' && img.imageUrl);

  return (
    <div>
        <div className="mb-6 flex justify-end">
            <ExportAllButton 
              onExportAllZip={onExportAllZip}
              onExportPdf={onExportPdf}
              disabled={!canExportAll || isExporting}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {images.map((imageInfo) => (
            <ImageCard 
                key={imageInfo.id} 
                imageInfo={imageInfo}
                onRegenerate={onRegenerate}
                onRemoveBg={onRemoveBg}
                onAnimate={onAnimate}
                onRefineRequest={onRefineRequest}
            />
        ))}
        </div>
    </div>
  );
};

export default ImageGallery;