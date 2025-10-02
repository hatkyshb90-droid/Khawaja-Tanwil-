import React, { useState, useRef } from 'react';
import type { AspectRatio, CustomStyle } from '../types';
import { SpinnerIcon, MagicWandIcon, UploadIcon, ClearIcon, PlusIcon } from './icons';

interface PromptPanelProps {
  prompts: string;
  onPromptsChange: (value: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (value: AspectRatio) => void;
  style: string;
  onStyleChange: (value: string) => void;
  variations: number;
  onVariationsChange: (value: number) => void;
  customStyles: CustomStyle[];
  onSaveStyle: (name: string, value: string) => void;
  referenceImage: { data: string; mimeType: string; } | null;
  onReferenceImageChange: (image: { data: string; mimeType: string; } | null) => void;
  onSubmit: () => void;
  onBatchSubmit: (totalImages: number) => void;
  isLoading: boolean;
  progressMessage: string;
  isExporting: boolean;
  exportProgressMessage: string;
}

const aspectRatios: AspectRatio[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const styles: string[] = ["Photorealistic", "Illustration", "3D Render", "Anime", "Cyberpunk", "Oil Painting", "Minimalist", "Pixel Art", "None"];

const BatchButton: React.FC<{onClick: () => void, disabled: boolean, children: React.ReactNode}> = ({ onClick, disabled, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-brand-gray-700 hover:bg-brand-gray-600 text-white font-semibold py-2 px-2 rounded-lg transition duration-200 text-sm disabled:bg-brand-gray-800 disabled:text-brand-gray-600 disabled:cursor-not-allowed"
    >
        {children}
    </button>
);

const PromptPanel: React.FC<PromptPanelProps> = ({
  prompts,
  onPromptsChange,
  aspectRatio,
  onAspectRatioChange,
  style,
  onStyleChange,
  variations,
  onVariationsChange,
  customStyles,
  onSaveStyle,
  referenceImage,
  onReferenceImageChange,
  onSubmit,
  onBatchSubmit,
  isLoading,
  progressMessage,
  isExporting,
  exportProgressMessage,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = isLoading || isExporting;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        onReferenceImageChange({ data: base64String, mimeType: file.type });
        setImagePreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    onReferenceImageChange(null);
    setImagePreview(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddStyle = () => {
    const name = window.prompt("Enter a name for your new style preset:");
    if (!name || name.trim() === '') return;

    const value = window.prompt(`Enter the style description for "${name}":\n(e.g., "impressionist painting, vibrant colors, brush strokes")`);
    if (!value || value.trim() === '') return;
    onSaveStyle(name, value);
  };


  return (
    <div className="bg-brand-gray-800 p-6 rounded-2xl shadow-lg sticky top-8 flex flex-col gap-6 h-full max-h-[calc(100vh-4rem)]">
      <div className="flex-grow flex flex-col gap-6 overflow-y-auto pr-2">
        <div>
          <label htmlFor="prompts" className="block text-sm font-medium text-brand-gray-300 mb-2">
            Enter Prompts (one per line)
          </label>
          <textarea
            id="prompts"
            value={prompts}
            onChange={(e) => onPromptsChange(e.target.value)}
            placeholder="e.g., A futuristic city at night, neon lights..."
            rows={8}
            className="w-full bg-brand-gray-900 border border-brand-gray-700 rounded-lg p-3 text-brand-gray-200 focus:ring-2 focus:ring-brand-blue-light focus:border-brand-blue-light transition duration-200 resize-y"
            disabled={isDisabled}
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-brand-gray-300 mb-2">
            Reference Image (Optional)
          </label>
          {imagePreview ? (
            <div className="relative group">
              <img src={imagePreview} alt="Reference preview" className="w-full h-32 object-cover rounded-lg" />
              <button 
                onClick={handleClearImage}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                aria-label="Clear reference image"
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-brand-gray-700 rounded-lg hover:bg-brand-gray-700/50 transition duration-200 disabled:cursor-not-allowed"
            >
              <UploadIcon className="w-8 h-8 text-brand-gray-600 mb-1" />
              <span className="text-sm text-brand-gray-300">Upload Image</span>
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg"
            className="hidden"
            disabled={isDisabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="variations" className="block text-sm font-medium text-brand-gray-300 mb-2">
              Variations
            </label>
            <input
              type="number"
              id="variations"
              value={variations}
              onChange={(e) => onVariationsChange(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="10"
              className="w-full bg-brand-gray-900 border border-brand-gray-700 rounded-lg p-3 text-brand-gray-200 focus:ring-2 focus:ring-brand-blue-light focus:border-brand-blue-light transition duration-200"
              disabled={isDisabled}
            />
          </div>
          <div>
            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-brand-gray-300 mb-2">
              Aspect Ratio
            </label>
            <select
              id="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value as AspectRatio)}
              className="w-full bg-brand-gray-900 border border-brand-gray-700 rounded-lg p-3 text-brand-gray-200 focus:ring-2 focus:ring-brand-blue-light focus:border-brand-blue-light transition duration-200"
              disabled={isDisabled || !!referenceImage}
            >
              {aspectRatios.map((ratio) => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
          </div>
        </div>
         <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="style" className="block text-sm font-medium text-brand-gray-300">
              Style
            </label>
            <button onClick={handleAddStyle} className="flex items-center text-sm text-brand-blue-light hover:text-white transition-colors duration-200" disabled={isDisabled}>
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Style
            </button>
          </div>
          <select
            id="style"
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
            className="w-full bg-brand-gray-900 border border-brand-gray-700 rounded-lg p-3 text-brand-gray-200 focus:ring-2 focus:ring-brand-blue-light focus:border-brand-blue-light transition duration-200"
            disabled={isDisabled}
          >
            <optgroup label="Default Styles">
              {styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
            {customStyles.length > 0 && (
              <optgroup label="My Styles">
                {customStyles.map((cs) => (
                  <option key={cs.name} value={cs.value}>{cs.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>
      <div className="flex-shrink-0">
         {(isLoading || isExporting) && (
          <div className="text-center text-sm text-brand-gray-300 mb-4 h-10 flex items-center justify-center break-all">
            <p>{isLoading ? progressMessage : exportProgressMessage}</p>
          </div>
        )}
        <button
          onClick={onSubmit}
          disabled={isDisabled}
          className="w-full flex items-center justify-center bg-brand-blue-light hover:bg-brand-blue text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-brand-gray-600 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Generating...
            </>
          ) : isExporting ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Exporting...
            </>
          ) : (
            <>
              <MagicWandIcon className="-ml-1 mr-3 h-5 w-5 text-white" />
              Generate Images
            </>
          )}
        </button>

        <div className="mt-4 pt-4 border-t border-brand-gray-700">
            <p className="text-center text-xs font-medium text-brand-gray-300 mb-3 uppercase tracking-wider">Batch Generate</p>
            <div className="grid grid-cols-3 gap-2">
                <BatchButton onClick={() => onBatchSubmit(50)} disabled={isDisabled}>50 Images</BatchButton>
                <BatchButton onClick={() => onBatchSubmit(100)} disabled={isDisabled}>100 Images</BatchButton>
                <BatchButton onClick={() => onBatchSubmit(150)} disabled={isDisabled}>150 Images</BatchButton>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PromptPanel;