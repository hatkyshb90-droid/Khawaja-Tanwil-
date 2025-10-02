import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import type { GeneratedImageInfo, AspectRatio, ImageStatus, CustomStyle } from './types';
import { generateImage, removeBackground, animateImage, refineImage } from './services/geminiService';
import PromptPanel from './components/PromptPanel';
import ImageGallery from './components/ImageGallery';
import Header from './components/Header';
import Footer from './components/Footer';
import RefineModal from './components/RefineModal';

declare var JSZip: any;
declare var jspdf: any;

const App: React.FC = () => {
  const [prompts, setPrompts] = useState<string>('A photorealistic robot holding a red skateboard.\nA majestic lion wearing a crown, studio lighting.\nA serene landscape of a cherry blossom forest at sunrise.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<string>('Photorealistic');
  const [variations, setVariations] = useState<number>(1);
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageInfo[]>([]);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressMessage, setExportProgressMessage] = useState<string>('');
  const [imageToRefine, setImageToRefine] = useState<GeneratedImageInfo | null>(null);
  
  React.useEffect(() => {
    try {
      const savedStyles = localStorage.getItem('customStyles');
      if (savedStyles) {
        setCustomStyles(JSON.parse(savedStyles));
      }
    } catch (error) {
      console.error("Failed to load custom styles from localStorage", error);
    }
  }, []);

  const handleSaveStyle = useCallback((name: string, value: string) => {
    const newStyle = { name, value };
    const updatedStyles = [...customStyles.filter(s => s.name.toLowerCase() !== name.toLowerCase()), newStyle].sort((a, b) => a.name.localeCompare(b.name));
    setCustomStyles(updatedStyles);
    localStorage.setItem('customStyles', JSON.stringify(updatedStyles));
  }, [customStyles]);

  const pollingIntervals = useRef<Record<string, number>>({});

  const updateImageState = (id: string, updates: Partial<GeneratedImageInfo>) => {
    setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleGenerate = useCallback(async () => {
    const promptList = prompts.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (promptList.length === 0) {
      alert('Please enter at least one prompt.');
      return;
    }

    setIsLoading(true);
    setProgressMessage('Initializing...');
    
    const initialImages: GeneratedImageInfo[] = [];
    promptList.forEach(prompt => {
      for (let i = 0; i < variations; i++) {
        initialImages.push({
          id: uuidv4(),
          prompt,
          imageUrl: null,
          videoUrl: null,
          status: 'pending',
          error: null,
        });
      }
    });
    setGeneratedImages(initialImages);

    for (let i = 0; i < initialImages.length; i++) {
      const currentImageInfo = initialImages[i];
      setProgressMessage(`Generating image ${i + 1} of ${initialImages.length}: "${currentImageInfo.prompt.substring(0, 30)}..."`);
      
      try {
        const imageUrl = await generateImage(currentImageInfo.prompt, aspectRatio, style, referenceImage);
        updateImageState(currentImageInfo.id, { imageUrl, status: 'success' });
      } catch (error) {
        console.error('Error generating image:', error);
        updateImageState(currentImageInfo.id, { status: 'error', error: (error as Error).message });
      }
    }

    setIsLoading(false);
    setProgressMessage('');
  }, [prompts, aspectRatio, style, variations, referenceImage]);

  const handleBatchGenerate = useCallback(async (totalImages: number) => {
    const promptList = prompts.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (promptList.length === 0) {
      alert('Please enter at least one prompt.');
      return;
    }

    setIsLoading(true);
    setProgressMessage(`Initializing batch of ${totalImages} images...`);
    
    const initialImages: GeneratedImageInfo[] = [];
    for (let i = 0; i < totalImages; i++) {
        const prompt = promptList[i % promptList.length];
        initialImages.push({
          id: uuidv4(),
          prompt,
          imageUrl: null,
          videoUrl: null,
          status: 'pending',
          error: null,
        });
    }
    setGeneratedImages(initialImages);

    for (let i = 0; i < initialImages.length; i++) {
      const currentImageInfo = initialImages[i];
      setProgressMessage(`Generating image ${i + 1} of ${initialImages.length}: "${currentImageInfo.prompt.substring(0, 30)}..."`);
      
      try {
        const imageUrl = await generateImage(currentImageInfo.prompt, aspectRatio, style, referenceImage);
        updateImageState(currentImageInfo.id, { imageUrl, status: 'success' });
      } catch (error) {
        console.error('Error generating image:', error);
        updateImageState(currentImageInfo.id, { status: 'error', error: (error as Error).message });
      }
    }

    setIsLoading(false);
    setProgressMessage('');
  }, [prompts, aspectRatio, style, referenceImage]);

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRegenerate = useCallback(async (id: string) => {
    const imageToRegenerate = generatedImages.find(img => img.id === id);
    if (!imageToRegenerate) return;

    updateImageState(id, { status: 'pending', error: null, imageUrl: null, videoUrl: null });
    try {
      const imageUrl = await generateImage(imageToRegenerate.prompt, aspectRatio, style, referenceImage);
      updateImageState(id, { imageUrl, status: 'success' });
    } catch (error) {
      console.error('Error regenerating image:', error);
      updateImageState(id, { status: 'error', error: (error as Error).message });
    }
  }, [generatedImages, aspectRatio, style, referenceImage]);
  
  const handleRemoveBg = useCallback(async (id: string) => {
    const imageToEdit = generatedImages.find(img => img.id === id);
    if (!imageToEdit || !imageToEdit.imageUrl) return;

    updateImageState(id, { status: 'editing-bg' });
    try {
      const base64Data = await urlToBase64(imageToEdit.imageUrl);
      const newImageUrl = await removeBackground(base64Data);
      updateImageState(id, { imageUrl: newImageUrl, status: 'success' });
    } catch (error) {
      console.error('Error removing background:', error);
      updateImageState(id, { status: 'edit-error', error: (error as Error).message });
    }
  }, [generatedImages]);

  const handleRefine = useCallback(async (id: string, refinementPrompt: string) => {
    setImageToRefine(null); // Close modal immediately
    const imageToEdit = generatedImages.find(img => img.id === id);
    if (!imageToEdit || !imageToEdit.imageUrl) return;

    updateImageState(id, { status: 'refining' });
    try {
      const base64Data = await urlToBase64(imageToEdit.imageUrl);
      const newImageUrl = await refineImage(base64Data, refinementPrompt);
      updateImageState(id, { imageUrl: newImageUrl, status: 'success' });
    } catch (error) {
      console.error('Error refining image:', error);
      updateImageState(id, { status: 'refine-error', error: (error as Error).message });
    }
  }, [generatedImages]);

  const pollAnimationStatus = useCallback(async (id: string, operation: any, ai: GoogleGenAI) => {
    try {
      let updatedOperation = await ai.operations.getVideosOperation({ operation: operation });

      if (updatedOperation.done) {
        window.clearInterval(pollingIntervals.current[id]);
        delete pollingIntervals.current[id];
        
        const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
          updateImageState(id, { videoUrl, status: 'animation-success' });
        } else {
          throw new Error("Animation completed but no video URL was found.");
        }
      }
    } catch (error) {
      console.error('Error polling animation status:', error);
      window.clearInterval(pollingIntervals.current[id]);
      delete pollingIntervals.current[id];
      updateImageState(id, { status: 'animation-error', error: (error as Error).message });
    }
  }, []);

  const handleAnimate = useCallback(async (id: string) => {
    const imageToAnimate = generatedImages.find(img => img.id === id);
    if (!imageToAnimate || !imageToAnimate.imageUrl) return;

    updateImageState(id, { status: 'animating' });
    try {
      const base64Data = await urlToBase64(imageToAnimate.imageUrl);
      const { operation, ai } = await animateImage(base64Data, imageToAnimate.prompt);
      
      pollingIntervals.current[id] = window.setInterval(() => {
        pollAnimationStatus(id, operation, ai);
      }, 10000);

    } catch (error) {
      console.error('Error starting animation:', error);
      updateImageState(id, { status: 'animation-error', error: (error as Error).message });
    }
  }, [generatedImages, pollAnimationStatus]);

  const handleExportAllZip = useCallback(async (format: 'jpeg' | 'webp') => {
    const successfulImages = generatedImages.filter(img => img.status === 'success' && img.imageUrl);
    if (successfulImages.length === 0) {
        alert("No successful images to export.");
        return;
    }

    setIsExporting(true);
    setExportProgressMessage(`Preparing ${successfulImages.length} images for ZIP export...`);

    try {
        const zip = new JSZip();
        for (let i = 0; i < successfulImages.length; i++) {
            const imageInfo = successfulImages[i];
            setExportProgressMessage(`Processing image ${i + 1}/${successfulImages.length} for ZIP...`);
            
            const response = await fetch(imageInfo.imageUrl!);
            let blob: Blob | null = await response.blob();
            let extension = 'jpg';
            
            if (format === 'webp') {
                blob = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0);
                        canvas.toBlob(resolve, 'image/webp');
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob as Blob);
                });
                extension = 'webp';
            } else {
                extension = blob.type.split('/')[1] === 'png' ? 'png' : 'jpg';
            }

            if (blob) {
              const safePrompt = imageInfo.prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
              zip.file(`generated_image_${i + 1}_${safePrompt}.${extension}`, blob);
            }
        }

        setExportProgressMessage('Generating ZIP file...');
        const content = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `generated_images_${format}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error creating ZIP file:", error);
        alert("Failed to create ZIP file.");
    } finally {
        setIsExporting(false);
        setExportProgressMessage('');
    }
  }, [generatedImages]);

  const handleExportPdf = useCallback(async () => {
    const successfulImages = generatedImages.filter(img => img.status === 'success' && img.imageUrl);
    if (successfulImages.length === 0) {
        alert("No successful images to export.");
        return;
    }

    setIsExporting(true);
    setExportProgressMessage(`Preparing ${successfulImages.length} images for PDF export...`);

    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4'
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let yPos = margin;

        for (let i = 0; i < successfulImages.length; i++) {
            const imageInfo = successfulImages[i];
            setExportProgressMessage(`Processing image ${i + 1}/${successfulImages.length} for PDF...`);

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            const imgData = await new Promise<string>((resolve, reject) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL(img.src.includes('png') ? 'image/png' : 'image/jpeg'));
                };
                img.onerror = reject;
                img.src = imageInfo.imageUrl!;
            });

            const imgHeight = (img.height * contentWidth) / img.width;
            
            doc.setFontSize(10);
            const splitPrompt = doc.splitTextToSize(imageInfo.prompt, contentWidth);
            const textHeight = doc.getTextDimensions(splitPrompt).h;

            if (yPos + textHeight + imgHeight + margin > pageHeight && i > 0) {
                doc.addPage();
                yPos = margin;
            }

            doc.text(splitPrompt, margin, yPos);
            yPos += textHeight + 5;
            
            doc.addImage(imgData, 'JPEG', margin, yPos, contentWidth, imgHeight);
            yPos += imgHeight + 20;
        }
        
        setExportProgressMessage('Saving PDF...');
        doc.save('generated_images_collection.pdf');

    } catch (error) {
        console.error("Error creating PDF:", error);
        alert("Failed to create PDF file.");
    } finally {
        setIsExporting(false);
        setExportProgressMessage('');
    }
  }, [generatedImages]);

  return (
    <div className="min-h-screen bg-brand-gray-900 text-brand-gray-200 flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 xl:col-span-3">
          <PromptPanel
            prompts={prompts}
            onPromptsChange={setPrompts}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            style={style}
            onStyleChange={setStyle}
            variations={variations}
            onVariationsChange={setVariations}
            customStyles={customStyles}
            onSaveStyle={handleSaveStyle}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            onSubmit={handleGenerate}
            onBatchSubmit={handleBatchGenerate}
            isLoading={isLoading}
            progressMessage={progressMessage}
            isExporting={isExporting}
            exportProgressMessage={exportProgressMessage}
          />
        </div>
        <div className="lg:col-span-8 xl:col-span-9">
          <ImageGallery 
            images={generatedImages}
            onExportAllZip={handleExportAllZip}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            onRegenerate={handleRegenerate}
            onRemoveBg={handleRemoveBg}
            onAnimate={handleAnimate}
            onRefineRequest={setImageToRefine}
          />
        </div>
      </main>
      <Footer />
      {imageToRefine && (
        <RefineModal 
          imageInfo={imageToRefine}
          onClose={() => setImageToRefine(null)}
          onSubmit={handleRefine}
        />
      )}
    </div>
  );
};

export default App;