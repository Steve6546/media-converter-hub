import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Wand2,
  ImageIcon,
  Square,
  Circle,
  RefreshCw,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateCoverImage, getGradientPaletteCount, getGradientPreviewStyle } from '@/lib/generateCover';

interface CoverImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  audioFileId: string;
  audioFileName: string;
  onSave: (file: File) => Promise<void>;
  onRemove: () => void;
}

type CropMode = 'square' | 'circle';
type TabValue = 'upload' | 'generate';

export const CoverImageModal = ({
  open,
  onOpenChange,
  currentImage,
  audioFileId,
  audioFileName,
  onSave,
  onRemove,
}: CoverImageModalProps) => {
  const [activeTab, setActiveTab] = useState<TabValue>('upload');
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropMode, setCropMode] = useState<CropMode>('square');
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPreview(currentImage);
      setSelectedFile(null);
      setActiveTab('upload');
      setCropMode('square');
      setSelectedPalette(Math.floor(Math.random() * getGradientPaletteCount()));
      setGeneratedBlob(null);
      setCustomTitle(audioFileName.replace(/\.[^/.]+$/, ''));
    }
  }, [open, currentImage, audioFileName]);

  // Generate cover when palette or title changes (in generate tab)
  const generatePreview = useCallback(async () => {
    if (activeTab !== 'generate') return;

    setIsGenerating(true);
    try {
      const title = customTitle || audioFileName.replace(/\.[^/.]+$/, '');
      const blob = await generateCoverImage(title, 512, selectedPalette);
      setGeneratedBlob(blob);

      const url = URL.createObjectURL(blob);
      setPreview(url);
    } catch (error) {
      console.error('Failed to generate cover:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [activeTab, selectedPalette, customTitle, audioFileName]);

  useEffect(() => {
    if (activeTab === 'generate') {
      generatePreview();
    }
  }, [activeTab, generatePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setGeneratedBlob(null);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      if (activeTab === 'generate' && generatedBlob) {
        const file = new File([generatedBlob], 'cover.png', { type: 'image/png' });
        await onSave(file);
        onOpenChange(false);
      } else if (selectedFile) {
        await onSave(selectedFile);
        onOpenChange(false);
      } else if (preview === null && currentImage !== null) {
        onRemove();
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
    setGeneratedBlob(null);
  };

  const handleRandomize = () => {
    setSelectedPalette(Math.floor(Math.random() * getGradientPaletteCount()));
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Clean up object URLs
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    }
    onOpenChange(isOpen);
  };

  const canSave = activeTab === 'upload'
    ? (selectedFile !== null || (preview === null && currentImage !== null))
    : generatedBlob !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none rounded-t-lg" />

        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Smart Cover Studio
          </DialogTitle>
          <DialogDescription>
            Create the perfect cover for your audio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generate
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all hover:border-primary/50 hover:bg-muted/50',
                  preview && activeTab === 'upload' ? 'border-transparent' : 'border-border',
                  cropMode === 'circle' && 'rounded-full'
                )}
              >
                {preview && activeTab === 'upload' ? (
                  <img
                    src={preview}
                    alt="Cover preview"
                    className={cn(
                      'h-full w-full object-cover',
                      cropMode === 'circle' && 'rounded-full'
                    )}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>

              {preview && activeTab === 'upload' && (
                <Button variant="outline" className="w-full" onClick={handleRemove}>
                  Remove Image
                </Button>
              )}
            </TabsContent>

            {/* Generate Tab */}
            <TabsContent value="generate" className="mt-4 space-y-4">
              {/* Preview */}
              <div
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border bg-muted transition-all',
                  cropMode === 'circle' && 'rounded-full',
                  isGenerating && 'animate-pulse'
                )}
              >
                {preview && activeTab === 'generate' ? (
                  <img
                    src={preview}
                    alt="Generated cover preview"
                    className={cn(
                      'h-full w-full object-cover',
                      cropMode === 'circle' && 'rounded-full'
                    )}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Wand2 className="h-12 w-12 text-muted-foreground/50 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="cover-title">Title on Cover</Label>
                <Input
                  id="cover-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={audioFileName}
                />
              </div>

              {/* Palette Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Color Palette</Label>
                  <Button variant="ghost" size="sm" onClick={handleRandomize} className="h-7 gap-1 px-2">
                    <RefreshCw className="h-3 w-3" />
                    Randomize
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: getGradientPaletteCount() }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPalette(i)}
                      className={cn(
                        'aspect-square rounded-lg transition-all hover:scale-105',
                        selectedPalette === i && 'ring-2 ring-primary ring-offset-2'
                      )}
                      style={{ background: getGradientPreviewStyle(i) }}
                    >
                      {selectedPalette === i && (
                        <div className="flex h-full items-center justify-center">
                          <Check className="h-4 w-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Crop Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-card/50 p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Crop Shape</p>
              <p className="text-xs text-muted-foreground">Choose how your cover appears</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setCropMode('square')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all',
                  cropMode === 'square'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Square className="h-3.5 w-3.5" />
                Square
              </button>
              <button
                onClick={() => setCropMode('circle')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all',
                  cropMode === 'circle'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Circle className="h-3.5 w-3.5" />
                Circle
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUploading || !canSave}>
            {isUploading ? 'Saving...' : 'Apply Cover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};