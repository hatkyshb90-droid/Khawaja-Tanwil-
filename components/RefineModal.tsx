import React, { useState } from 'react';
import type { GeneratedImageInfo } from '../types';
import { MagicWandIcon, SpinnerIcon } from './icons';

interface RefineModalProps {
  imageInfo: GeneratedImageInfo;
  onClose: () => void;
  onSubmit: (id: string, prompt: string) => void;
}

const RefineModal: React.FC<RefineModalProps> = ({ imageInfo, onClose, onSubmit }) => {
  const [refinementPrompt, setRefinementPrompt] = useState('Improve quality and details, enhance lighting.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim()) {
      alert('Please enter a refinement prompt.');
      return;
    }
    setIsSubmitting(true);
    onSubmit(imageInfo.id, refinementPrompt.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-gray-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Refine Image</h3>
            <div className="aspect-square w-full relative bg-brand-gray-700 rounded-md overflow-hidden mb-4">
              {imageInfo.imageUrl && (
                <img src={imageInfo.imageUrl} alt={imageInfo.prompt} className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <label htmlFor="refinement-prompt" className="block text-sm font-medium text-brand-gray-300 mb-2">
                Refinement Prompt
              </label>
              <textarea
                id="refinement-prompt"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="e.g., Make the background darker, add more detail..."
                rows={4}
                className="w-full bg-brand-gray-900 border border-brand-gray-700 rounded-lg p-3 text-brand-gray-200 focus:ring-2 focus:ring-brand-blue-light focus:border-brand-blue-light transition duration-200 resize-y"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="bg-brand-gray-800/50 px-6 py-4 flex justify-end items-center gap-4 border-t border-brand-gray-700 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand-gray-600 hover:bg-brand-gray-500 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-48 flex items-center justify-center bg-brand-blue-light hover:bg-brand-blue text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform disabled:bg-brand-gray-600 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <MagicWandIcon className="-ml-1 mr-3 h-5 w-5 text-white" />
                  Generate Refinement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefineModal;
