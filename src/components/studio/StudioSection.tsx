import { useMemo, useState, useCallback } from 'react';
import { useMedia } from '@/contexts/MediaContext';
import { useStudio } from '@/contexts/StudioContext';
import { StudioDropZone } from './StudioDropZone';
import { StudioJobProgress } from './StudioJobProgress';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { RealCompressionPanel } from './RealCompressionPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Sparkles, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StudioAssetType = 'video' | 'image';
type VideoPreset = 'tiny' | 'balanced' | 'high';
type VideoResolution = '1080p' | '720p' | '480p';
type VideoFps = '60' | '30' | '24';
type VideoCodec = 'h264' | 'h265';
type BitrateMode = 'auto' | 'manual';
type AudioMode = 'keep' | 'remove' | 'compress-128' | 'compress-96';
type ThumbnailFormat = 'png' | 'jpg' | 'webp';
type SubtitleFormat = 'srt' | 'vtt';
type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
type PlatformPreset = 'tiktok' | 'reels' | 'youtube';
type ImageFormat = 'jpg' | 'png' | 'webp' | 'avif';

interface VideoSettings {
  resolution: VideoResolution;
  fps: VideoFps;
  bitrateMode: BitrateMode;
  bitrateKbps: number;
  codec: VideoCodec;
  audioMode: AudioMode;
  targetSizeMb: number;
}

interface EnhanceOptions {
  stabilization: boolean;
  denoise: boolean;
  sharpen: boolean;
  normalizeAudio: boolean;
  loudnessTarget: number;
}

interface ThumbnailOptions {
  autoExtract: boolean;
  enableCrop: boolean;
  addText: boolean;
  addLogo: boolean;
  exportFormat: ThumbnailFormat;
  youtubeSafe: boolean;
}

interface SubtitleOptions {
  burnIn: boolean;
  exportFormats: SubtitleFormat[];
  speechToText: boolean;
  translate: boolean;
}

interface BrandOptions {
  watermark: boolean;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  intro: boolean;
  outro: boolean;
  frameBorder: boolean;
  platformPreset: PlatformPreset;
}

interface ImageOptions {
  format: ImageFormat;
  backgroundRemoval: boolean;
  smartResize: boolean;
  upscale: boolean;
  faceBlur: boolean;
  removeExif: boolean;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

const PRESET_DETAILS: Record<VideoPreset, { title: string; description: string }> = {
  tiny: {
    title: 'Tiny',
    description: 'Smallest size for quick sharing and fast uploads.',
  },
  balanced: {
    title: 'Balanced',
    description: 'Great quality with solid size reduction.',
  },
  high: {
    title: 'High',
    description: 'Best quality with modest compression.',
  },
};

const PRESET_DEFAULTS: Record<VideoPreset, Partial<VideoSettings>> = {
  tiny: {
    resolution: '480p',
    fps: '24',
    bitrateMode: 'auto',
    codec: 'h265',
    audioMode: 'compress-96',
    targetSizeMb: 20,
  },
  balanced: {
    resolution: '720p',
    fps: '30',
    bitrateMode: 'auto',
    codec: 'h264',
    audioMode: 'compress-128',
    targetSizeMb: 60,
  },
  high: {
    resolution: '1080p',
    fps: '60',
    bitrateMode: 'auto',
    codec: 'h264',
    audioMode: 'keep',
    targetSizeMb: 100,
  },
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const getAssetType = (file: File): StudioAssetType => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(extension) ? 'image' : 'video';
};

const PresetCard = ({
  preset,
  isActive,
  onSelect,
}: {
  preset: VideoPreset;
  isActive: boolean;
  onSelect: (value: VideoPreset) => void;
}) => {
  const details = PRESET_DETAILS[preset];

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={cn(
        'rounded-lg border p-4 text-left transition-colors',
        isActive
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-muted/40'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{details.title}</h4>
        {isActive && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Selected
          </Badge>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{details.description}</p>
    </button>
  );
};

export const StudioSection = () => {
  const { isBackendConnected } = useMedia();
  const { studioJobs, startStudioJob } = useStudio();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<StudioAssetType | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [videoPreset, setVideoPreset] = useState<VideoPreset>('balanced');
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    resolution: '1080p',
    fps: '60',
    bitrateMode: 'auto',
    bitrateKbps: 3500,
    codec: 'h264',
    audioMode: 'keep',
    targetSizeMb: 60,
  });
  const [enhanceOptions, setEnhanceOptions] = useState<EnhanceOptions>({
    stabilization: false,
    denoise: true,
    sharpen: true,
    normalizeAudio: true,
    loudnessTarget: -14,
  });
  const [thumbnailOptions, setThumbnailOptions] = useState<ThumbnailOptions>({
    autoExtract: true,
    enableCrop: true,
    addText: false,
    addLogo: false,
    exportFormat: 'png',
    youtubeSafe: true,
  });
  const [subtitleOptions, setSubtitleOptions] = useState<SubtitleOptions>({
    burnIn: true,
    exportFormats: ['srt'],
    speechToText: false,
    translate: false,
  });
  const [brandOptions, setBrandOptions] = useState<BrandOptions>({
    watermark: false,
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 40,
    intro: false,
    outro: false,
    frameBorder: false,
    platformPreset: 'youtube',
  });
  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    format: 'webp',
    backgroundRemoval: false,
    smartResize: true,
    upscale: false,
    faceBlur: false,
    removeExif: true,
  });

  const fileSummary = useMemo(() => {
    if (!selectedFile) return null;
    return {
      name: selectedFile.name,
      size: formatFileSize(selectedFile.size),
      type: selectedFile.type || 'unknown',
    };
  }, [selectedFile]);

  const updateVideoSettings = (updates: Partial<VideoSettings>) => {
    setVideoSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setAssetType(getAssetType(file));
    setSubtitleFile(null);
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setAssetType(null);
    setSubtitleFile(null);
  };

  // Real compression settings from RealCompressionPanel
  const [realCompressionSettings, setRealCompressionSettings] = useState<{
    targetHeight: number;
    fps: number;
    codec: 'h264' | 'h265' | 'av1';
    audioBitrate: number;
    estimatedSize: number;
  } | null>(null);

  const handleCompressionSettingsChange = useCallback((settings: {
    targetHeight: number;
    fps: number;
    codec: 'h264' | 'h265' | 'av1';
    audioBitrate: number;
    estimatedSize: number;
  }) => {
    setRealCompressionSettings(settings);
  }, []);

  const applyPreset = (preset: VideoPreset, overrides: Partial<VideoSettings> = {}) => {
    setVideoPreset(preset);
    setVideoSettings((prev) => {
      const next = {
        ...prev,
        ...PRESET_DEFAULTS[preset],
        ...overrides,
      };
      return {
        ...next,
        targetSizeMb: Math.min(100, Math.max(1, next.targetSizeMb)),
      };
    });
  };

  const handleSmartCompress = () => {
    if (!selectedFile) return;

    const sizeMb = Math.max(1, Math.round(selectedFile.size / (1024 * 1024)));
    let recommendedPreset: VideoPreset = 'balanced';

    if (sizeMb > 800) {
      recommendedPreset = 'tiny';
    } else if (sizeMb > 300) {
      recommendedPreset = 'balanced';
    } else {
      recommendedPreset = 'high';
    }

    const targetMultiplier = recommendedPreset === 'tiny' ? 0.2 : recommendedPreset === 'balanced' ? 0.35 : 0.6;
    const targetSizeMb = Math.min(100, Math.max(10, Math.round(sizeMb * targetMultiplier)));

    applyPreset(recommendedPreset, { targetSizeMb });
    toast.success('Smart compression settings applied');
  };

  const handleQueueJob = async () => {
    if (!selectedFile || !assetType) return;

    if (assetType === 'image') {
      await startStudioJob('image', selectedFile, imageOptions);
      return;
    }

    const compressOptions = {
      ...videoSettings,
      fps: Number(videoSettings.fps),
      targetSizeMb: Math.min(100, Math.max(1, videoSettings.targetSizeMb)),
      brand: brandOptions,
    };

    await startStudioJob('compress', selectedFile, compressOptions);

    const shouldEnhance =
      enhanceOptions.stabilization ||
      enhanceOptions.denoise ||
      enhanceOptions.sharpen ||
      enhanceOptions.normalizeAudio;

    if (shouldEnhance) {
      await startStudioJob('enhance', selectedFile, enhanceOptions);
    }

    if (thumbnailOptions.autoExtract) {
      await startStudioJob('thumbnails', selectedFile, thumbnailOptions);
    }

    const wantsSubtitles =
      subtitleOptions.burnIn || subtitleOptions.exportFormats.length > 0;

    if (wantsSubtitles) {
      if (!subtitleFile) {
        toast.error('Please upload a subtitle file (SRT or VTT).');
        return;
      }
      await startStudioJob('subtitles', selectedFile, subtitleOptions, {
        subtitle: subtitleFile,
      });
    }
  };

  if (!isBackendConnected) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Backend Not Connected</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            The studio pipeline needs the backend server on port 3001.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Studio / Optimizer
        </h2>
        <p className="text-muted-foreground">
          Professional presets and advanced controls for video and image workflows.
        </p>
      </div>

      <StudioDropZone onFileSelected={handleFileSelected} />
      <StudioJobProgress jobs={studioJobs} />

      {selectedFile ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{fileSummary?.name}</p>
                <Badge variant="secondary">{assetType === 'image' ? 'Image' : 'Video'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {fileSummary?.size} | {fileSummary?.type}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetSelection}>
                Remove File
              </Button>
            </div>
          </div>

          {assetType === 'video' && (
            <>
              {/* Real Compression Panel - replaces old preset cards */}
              <RealCompressionPanel
                file={selectedFile}
                onSettingsChange={handleCompressionSettingsChange}
                onStartCompress={handleQueueJob}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Video Clean & Enhance</CardTitle>
                  <CardDescription>
                    Optional cleanup and audio normalization for a polished finish.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Stabilization</p>
                        <p className="text-xs text-muted-foreground">Smooth handheld motion</p>
                      </div>
                      <Switch
                        checked={enhanceOptions.stabilization}
                        onCheckedChange={(checked) =>
                          setEnhanceOptions((prev) => ({ ...prev, stabilization: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Denoise</p>
                        <p className="text-xs text-muted-foreground">Remove grain and artifacts</p>
                      </div>
                      <Switch
                        checked={enhanceOptions.denoise}
                        onCheckedChange={(checked) =>
                          setEnhanceOptions((prev) => ({ ...prev, denoise: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Light Sharpen</p>
                        <p className="text-xs text-muted-foreground">Subtle detail boost</p>
                      </div>
                      <Switch
                        checked={enhanceOptions.sharpen}
                        onCheckedChange={(checked) =>
                          setEnhanceOptions((prev) => ({ ...prev, sharpen: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Audio Normalization</p>
                        <p className="text-xs text-muted-foreground">Balance voice and music</p>
                      </div>
                      <Switch
                        checked={enhanceOptions.normalizeAudio}
                        onCheckedChange={(checked) =>
                          setEnhanceOptions((prev) => ({ ...prev, normalizeAudio: checked }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Loudness Target</p>
                      <span className="text-sm text-muted-foreground">
                        {enhanceOptions.loudnessTarget} LUFS
                      </span>
                    </div>
                    <Slider
                      min={-23}
                      max={-9}
                      step={1}
                      value={[enhanceOptions.loudnessTarget]}
                      onValueChange={(value) =>
                        setEnhanceOptions((prev) => ({ ...prev, loudnessTarget: value[0] }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thumbnail / Poster Studio</CardTitle>
                  <CardDescription>
                    Auto-extract frames and craft platform-ready posters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Auto-Extract 12 Frames</p>
                        <p className="text-xs text-muted-foreground">Pick the best moments</p>
                      </div>
                      <Switch
                        checked={thumbnailOptions.autoExtract}
                        onCheckedChange={(checked) =>
                          setThumbnailOptions((prev) => ({ ...prev, autoExtract: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Enable Crop</p>
                        <p className="text-xs text-muted-foreground">Focus on key subjects</p>
                      </div>
                      <Switch
                        checked={thumbnailOptions.enableCrop}
                        onCheckedChange={(checked) =>
                          setThumbnailOptions((prev) => ({ ...prev, enableCrop: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Add Text</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Headline overlays</p>
                      </div>
                      <Switch
                        checked={thumbnailOptions.addText}
                        onCheckedChange={(checked) =>
                          setThumbnailOptions((prev) => ({ ...prev, addText: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Add Logo</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Brand mark placement</p>
                      </div>
                      <Switch
                        checked={thumbnailOptions.addLogo}
                        onCheckedChange={(checked) =>
                          setThumbnailOptions((prev) => ({ ...prev, addLogo: checked }))
                        }
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select
                        value={thumbnailOptions.exportFormat}
                        onValueChange={(value) =>
                          setThumbnailOptions((prev) => ({
                            ...prev,
                            exportFormat: value as ThumbnailFormat,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpg">JPG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">YouTube-Safe Preset</p>
                        <p className="text-xs text-muted-foreground">Safe margins and aspect</p>
                      </div>
                      <Switch
                        checked={thumbnailOptions.youtubeSafe}
                        onCheckedChange={(checked) =>
                          setThumbnailOptions((prev) => ({ ...prev, youtubeSafe: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subtitles Studio</CardTitle>
                  <CardDescription>
                    Burn-in subtitles or export caption files for distribution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Burn-In Subtitles</p>
                      <p className="text-xs text-muted-foreground">Embed captions in the video</p>
                    </div>
                    <Switch
                      checked={subtitleOptions.burnIn}
                      onCheckedChange={(checked) =>
                        setSubtitleOptions((prev) => ({ ...prev, burnIn: checked }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Export Formats</Label>
                    <ToggleGroup
                      type="multiple"
                      value={subtitleOptions.exportFormats}
                      onValueChange={(value) =>
                        setSubtitleOptions((prev) => ({ ...prev, exportFormats: value as SubtitleFormat[] }))
                      }
                      className="flex flex-wrap justify-start gap-2"
                    >
                      <ToggleGroupItem value="srt" className="h-9 px-4" variant="outline">
                        SRT
                      </ToggleGroupItem>
                      <ToggleGroupItem value="vtt" className="h-9 px-4" variant="outline">
                        VTT
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle File (SRT or VTT)</Label>
                    <Input
                      type="file"
                      accept=".srt,.vtt"
                      onChange={(event) => {
                        const files = event.target.files ? Array.from(event.target.files) : [];
                        setSubtitleFile(files[0] || null);
                      }}
                    />
                    {subtitleFile && (
                      <p className="text-xs text-muted-foreground">
                        {subtitleFile.name}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Speech-to-Text</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Optional service add-on</p>
                      </div>
                      <Switch
                        checked={subtitleOptions.speechToText}
                        onCheckedChange={(checked) =>
                          setSubtitleOptions((prev) => ({ ...prev, speechToText: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Translation</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Optional language service</p>
                      </div>
                      <Switch
                        checked={subtitleOptions.translate}
                        onCheckedChange={(checked) =>
                          setSubtitleOptions((prev) => ({ ...prev, translate: checked }))
                        }
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Brand Kit
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      Coming soon
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Apply watermarking, intros, and platform presets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Watermark</p>
                        <p className="text-xs text-muted-foreground">Position and opacity</p>
                      </div>
                      <Switch
                        checked={brandOptions.watermark}
                        onCheckedChange={(checked) =>
                          setBrandOptions((prev) => ({ ...prev, watermark: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Watermark Position</Label>
                      <Select
                        value={brandOptions.watermarkPosition}
                        onValueChange={(value) =>
                          setBrandOptions((prev) => ({
                            ...prev,
                            watermarkPosition: value as WatermarkPosition,
                          }))
                        }
                      >
                        <SelectTrigger disabled>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Watermark Opacity</p>
                      <span className="text-sm text-muted-foreground">
                        {brandOptions.watermarkOpacity}%
                      </span>
                    </div>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[brandOptions.watermarkOpacity]}
                      onValueChange={(value) =>
                        setBrandOptions((prev) => ({ ...prev, watermarkOpacity: value[0] }))
                      }
                      disabled
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Intro</p>
                        <p className="text-xs text-muted-foreground">Add opening</p>
                      </div>
                      <Switch
                        checked={brandOptions.intro}
                        onCheckedChange={(checked) =>
                          setBrandOptions((prev) => ({ ...prev, intro: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Outro</p>
                        <p className="text-xs text-muted-foreground">Add closing</p>
                      </div>
                      <Switch
                        checked={brandOptions.outro}
                        onCheckedChange={(checked) =>
                          setBrandOptions((prev) => ({ ...prev, outro: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Frame / Border</p>
                        <p className="text-xs text-muted-foreground">Visual framing</p>
                      </div>
                      <Switch
                        checked={brandOptions.frameBorder}
                        onCheckedChange={(checked) =>
                          setBrandOptions((prev) => ({ ...prev, frameBorder: checked }))
                        }
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Platform Preset</Label>
                    <Select
                      value={brandOptions.platformPreset}
                      onValueChange={(value) =>
                        setBrandOptions((prev) => ({ ...prev, platformPreset: value as PlatformPreset }))
                      }
                    >
                      <SelectTrigger disabled>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="reels">Reels</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {assetType === 'image' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Image Studio (Safe)</CardTitle>
                  <CardDescription>
                    Clean, compress, and convert images without risky transformations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Compress & Convert</Label>
                    <Select
                      value={imageOptions.format}
                      onValueChange={(value) =>
                        setImageOptions((prev) => ({ ...prev, format: value as ImageFormat }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                        <SelectItem value="avif">AVIF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Background Removal</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Cut out subject</p>
                      </div>
                      <Switch
                        checked={imageOptions.backgroundRemoval}
                        onCheckedChange={(checked) =>
                          setImageOptions((prev) => ({ ...prev, backgroundRemoval: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Smart Resize / Crop</p>
                        <p className="text-xs text-muted-foreground">Fit target dimensions</p>
                      </div>
                      <Switch
                        checked={imageOptions.smartResize}
                        onCheckedChange={(checked) =>
                          setImageOptions((prev) => ({ ...prev, smartResize: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Upscale</p>
                        <p className="text-xs text-muted-foreground">Increase resolution</p>
                      </div>
                      <Switch
                        checked={imageOptions.upscale}
                        onCheckedChange={(checked) =>
                          setImageOptions((prev) => ({ ...prev, upscale: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Face Blur</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Coming soon
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Privacy protection</p>
                      </div>
                      <Switch
                        checked={imageOptions.faceBlur}
                        onCheckedChange={(checked) =>
                          setImageOptions((prev) => ({ ...prev, faceBlur: checked }))
                        }
                        disabled
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                      <div>
                        <p className="text-sm font-medium">Remove EXIF Metadata</p>
                        <p className="text-xs text-muted-foreground">Strip location and device info</p>
                      </div>
                      <Switch
                        checked={imageOptions.removeExif}
                        onCheckedChange={(checked) =>
                          setImageOptions((prev) => ({ ...prev, removeExif: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ImagePreviewPanel file={selectedFile} options={imageOptions} />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ready to Process</CardTitle>
              <CardDescription>
                Queue the optimization job with your chosen presets and options.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-3">
              <Button onClick={handleQueueJob}>Queue Optimization</Button>
              <Button variant="outline" onClick={resetSelection}>
                Reset
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload to Start</CardTitle>
            <CardDescription>
              Add a video or image to unlock presets, advanced controls, and studio tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              'Smart compression presets',
              'Cleanup and enhancement tools',
              'Thumbnail and poster workflow',
              'Brand kit and platform presets',
              'Safe image operations',
              'Subtitle export options',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )
      }
    </div >
  );
};
