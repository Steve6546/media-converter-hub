import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImagePreviewOptions {
  format: string;
  backgroundRemoval: boolean;
  smartResize: boolean;
  upscale: boolean;
  faceBlur: boolean;
  removeExif: boolean;
}

interface ImagePreviewPanelProps {
  file: File | null;
  options: ImagePreviewOptions;
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const ImagePreviewPanel = ({ file, options }: ImagePreviewPanelProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setImageMeta(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!previewUrl) {
      setImageMeta(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageMeta({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const previewRatio = useMemo(() => {
    if (options.smartResize) return 16 / 9;
    if (imageMeta && imageMeta.height) {
      return imageMeta.width / imageMeta.height;
    }
    return 1;
  }, [options.smartResize, imageMeta]);

  const previewBadges = useMemo(() => {
    const badges: string[] = [];
    if (options.smartResize) badges.push('Smart crop');
    if (options.upscale) badges.push('Upscale');
    if (options.backgroundRemoval) badges.push('BG removed');
    if (options.faceBlur) badges.push('Face blur');
    if (options.removeExif) badges.push('EXIF removed');
    return badges;
  }, [
    options.backgroundRemoval,
    options.faceBlur,
    options.removeExif,
    options.smartResize,
    options.upscale,
  ]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          Live Preview
        </CardTitle>
        <CardDescription>Instant preview only. Final output is generated on apply.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="overflow-hidden rounded-lg border bg-muted"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          <AspectRatio ratio={previewRatio}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Image preview"
                className={cn(
                  'h-full w-full transition-transform duration-200 ease-out',
                  options.smartResize ? 'object-cover' : 'object-contain'
                )}
                style={{
                  transform: `scale(${options.upscale ? 1.1 : 1})`,
                  filter: options.faceBlur ? 'blur(8px)' : 'none',
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No image selected
              </div>
            )}
          </AspectRatio>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{options.format.toUpperCase()}</Badge>
          {previewBadges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>

        {file && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{file.name}</p>
            <p>{formatFileSize(file.size)}</p>
            {imageMeta && (
              <p>
                {imageMeta.width} x {imageMeta.height}px
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
