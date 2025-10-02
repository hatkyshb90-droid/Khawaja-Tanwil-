import React from 'react';
import type { GeneratedImageInfo } from '../types';
import { SpinnerIcon, ErrorIcon, RegenerateIcon, RemoveBgIcon, AnimateIcon, RefineIcon, ExportIcon } from './icons';

interface ImageCardProps {
  imageInfo: GeneratedImageInfo;
  onRegenerate: (id: string) => void;
  onRemoveBg: (id: string) => void;
  onAnimate: (id: string) => void;
  onRefineRequest: (image: GeneratedImageInfo) => void;
}

const ActionButton: React.FC<{ onClick: () => void, disabled?: boolean, 'aria-label': string, children: React.ReactNode }> = 
({ onClick, disabled, 'aria-label': ariaLabel, children }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className="p-2 bg-brand-gray-700/80 rounded-full text-white hover:bg-brand-blue-light focus:outline-none focus:ring-2 focus:ring-brand-blue-light transition-all duration-200 disabled:bg-brand-gray-600/50 disabled:text-brand-gray-400 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );
};

const ExportModalButton: React.FC<{onClick: () => void, children: React.ReactNode}> = ({onClick, children}) => (
    <button onClick={onClick} className="w-full text-left bg-brand-gray-700 hover:bg-brand-gray-600 text-white font-semibold py-2 px-3 rounded-lg transition duration-200 text-sm">
        {children}
    </button>
);


const ImageCard: React.FC<ImageCardProps> = ({ imageInfo, onRegenerate, onRemoveBg, onAnimate, onRefineRequest }) => {
  const { status, imageUrl, videoUrl, prompt } = imageInfo;
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  const getSafeFilename = (extension: string) => {
      const safePrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      return `vize_ai_${safePrompt}.${extension}`;
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const processImage = (format: 'jpeg' | 'webp' | 'png', options?: { width?: number; height?: number; crop?: boolean }): Promise<string> => {
      return new Promise((resolve, reject) => {
          if (!imageUrl) return reject(new Error('Image URL is not available'));
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject(new Error('Canvas context not available'));

              let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
              
              if (options?.width && options?.height) {
                  canvas.width = options.width;
                  canvas.height = options.height;

                  if (options.crop) {
                      const targetAspectRatio = options.width / options.height;
                      const sourceAspectRatio = img.width / img.height;
                      if (sourceAspectRatio > targetAspectRatio) {
                          sourceWidth = img.height * targetAspectRatio;
                          sourceX = (img.width - sourceWidth) / 2;
                      } else {
                          sourceHeight = img.width / targetAspectRatio;
                          sourceY = (img.height - sourceHeight) / 2;
                      }
                      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, options.width, options.height);
                  } else {
                       ctx.drawImage(img, 0, 0, options.width, options.height);
                  }
              } else {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx.drawImage(img, 0, 0);
              }

              resolve(canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.9 : undefined));
          };
          img.onerror = reject;
          img.src = imageUrl;
      });
  };

  const handleExport = async (format: 'jpeg' | 'webp' | 'png') => {
      try {
          const dataUrl = await processImage(format);
          downloadDataUrl(dataUrl, getSafeFilename(format));
      } catch (e) { 
        console.error('Export failed', e);
        alert(`Failed to export as ${format.toUpperCase()}.`);
      }
  };
  
  const handleSocialExport = async (width: number, height: number, name: string) => {
      try {
          const dataUrl = await processImage('jpeg', { width, height, crop: true });
          downloadDataUrl(dataUrl, `${name}_${getSafeFilename('jpg')}`);
      } catch (e) {
        console.error('Social export failed', e);
        alert('Failed to export for social media.');
      }
  };

  const handleShare = async () => {
    const url = videoUrl || imageUrl;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const extension = videoUrl ? 'mp4' : (imageUrl?.includes('png') ? 'png' : 'jpg');
      const filename = `generated_image.${extension}`;
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `AI Art: ${prompt}`,
          text: `Check out this image I generated: ${prompt}`,
        });
      } else {
        alert('Your browser does not support sharing files.');
      }
    } catch (err) {
      console.error('Error sharing file:', err);
      if ((err as Error).name !== 'AbortError') {
        alert(`Could not share image. Error: ${(err as Error).message}`);
      }
    }
  };

  const isActionable = ['success', 'edit-error', 'animation-error', 'animation-success', 'refine-error'].includes(status);
  const isProcessing = ['pending', 'editing-bg', 'animating', 'refining'].includes(status);
  const canExport = isActionable && (!!imageUrl || !!videoUrl);
  const canBeRefined = isActionable && !!imageUrl;

  const renderOverlay = () => {
    const messages: { [key in typeof status]?: string } = {
        'pending': 'Generating...',
        'editing-bg': 'Removing Background...',
        'animating': 'Animating Image...',
        'refining': 'Refining Image...',
        'error': 'Generation Failed',
        'edit-error': 'Edit Failed',
        'animation-error': 'Animation Failed',
        'refine-error': 'Refine Failed',
    };
    const message = messages[status];

    if (isProcessing || status.includes('error')) {
        const error = imageInfo.error;
        return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${status.includes('error') ? 'bg-red-900/50' : 'bg-brand-gray-900/80'}`}>
                {isProcessing ? <SpinnerIcon className="w-10 h-10 text-brand-gray-300 animate-spin" /> : <ErrorIcon className="w-10 h-10 text-red-400" />}
                <span className={`mt-4 text-sm font-semibold text-center ${status.includes('error') ? 'text-red-300' : 'text-brand-gray-300'}`}>{message}</span>
                {error && <p className="mt-1 text-xs text-red-400 text-center break-words">{error}</p>}
            </div>
        );
    }
    return null;
  };

  return (
    <>
      <div className="bg-brand-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col group">
        <div 
            className={`aspect-square w-full relative bg-brand-gray-700 ${canBeRefined ? 'cursor-pointer' : ''}`}
            onClick={() => canBeRefined && onRefineRequest(imageInfo)}
        >
          {status === 'animation-success' && videoUrl ? (
              <video src={videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
          ) : (
              imageUrl && <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
          )}
          {renderOverlay()}
        </div>
        <div className="p-4 bg-brand-gray-800/50">
          <p className="text-sm text-brand-gray-300 leading-snug break-words h-10 overflow-hidden line-clamp-2" title={prompt}>{prompt}</p>
          <div className="mt-3 pt-3 border-t border-brand-gray-700 grid grid-cols-5 gap-2 px-2">
              <ActionButton onClick={() => onRegenerate(imageInfo.id)} disabled={isProcessing} aria-label="Regenerate image">
                  <RegenerateIcon className="w-5 h-5" />
              </ActionButton>
              <ActionButton onClick={() => onRefineRequest(imageInfo)} disabled={!canBeRefined} aria-label="Refine image">
                  <RefineIcon className="w-5 h-5" />
              </ActionButton>
              <ActionButton onClick={() => onRemoveBg(imageInfo.id)} disabled={!canBeRefined} aria-label="Remove background">
                  <RemoveBgIcon className="w-5 h-5" />
              </ActionButton>
              <ActionButton onClick={() => onAnimate(imageInfo.id)} disabled={!canBeRefined} aria-label="Animate image">
                  <AnimateIcon className="w-5 h-5" />
              </ActionButton>
              <ActionButton onClick={() => setIsExportModalOpen(true)} disabled={!canExport} aria-label="Export or Download">
                  <ExportIcon className="w-5 h-5" />
              </ActionButton>
          </div>
        </div>
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsExportModalOpen(false)}>
            <div className="bg-brand-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-6 text-center">Export Options</h3>
                
                <div className="space-y-6">
                    {imageUrl && (
                      <div>
                          <h4 className="font-semibold text-brand-gray-300 mb-2 border-b border-brand-gray-700 pb-1">Download Image As</h4>
                          <div className="flex space-x-2 pt-2">
                              <ExportModalButton onClick={() => handleExport('jpeg')}>JPG</ExportModalButton>
                              <ExportModalButton onClick={() => handleExport('png')}>PNG</ExportModalButton>
                              <ExportModalButton onClick={() => handleExport('webp')}>WebP</ExportModalButton>
                          </div>
                      </div>
                    )}

                    {imageUrl && (
                      <div>
                          <h4 className="font-semibold text-brand-gray-300 mb-2 border-b border-brand-gray-700 pb-1">Social Media Presets</h4>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                              <ExportModalButton onClick={() => handleSocialExport(1080, 1080, 'instagram_post')}>Instagram Post (1:1)</ExportModalButton>
                              <ExportModalButton onClick={() => handleSocialExport(1080, 1920, 'instagram_story')}>Instagram Story (9:16)</ExportModalButton>
                              <ExportModalButton onClick={() => handleSocialExport(1080, 1920, 'tiktok_post')}>TikTok Post (9:16)</ExportModalButton>
                              <ExportModalButton onClick={() => handleSocialExport(1200, 675, 'x_post')}>X/Twitter Post (16:9)</ExportModalButton>
                          </div>
                      </div>
                    )}

                    <div>
                        <h4 className="font-semibold text-brand-gray-300 mb-2 border-b border-brand-gray-700 pb-1">Share</h4>
                        <div className="pt-2">
                          <ExportModalButton onClick={handleShare}>{videoUrl ? 'Share Video' : 'Share Image'}</ExportModalButton>
                        </div>
                    </div>
                </div>

                <button onClick={() => setIsExportModalOpen(false)} className="mt-8 w-full bg-brand-blue-light hover:bg-brand-blue text-white font-bold py-2 px-4 rounded-lg transition duration-200">Close</button>
            </div>
        </div>
      )}
    </>
  );
};

export default ImageCard;