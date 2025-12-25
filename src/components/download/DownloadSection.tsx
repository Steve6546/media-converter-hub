import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Link2,
    Loader2,
    Search,
    Download,
    Music,
    Video,
    Eye,
    Heart,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    X,
    ExternalLink,
    Clipboard,
    FileVideo,
    FileAudio,
} from 'lucide-react';
import { toast } from 'sonner';
import { PlatformIcon, getPlatformConfig, PLATFORM_CONFIG } from '@/components/icons/BrandIcons';

interface MediaMetadata {
    title: string;
    description: string | null;
    platform: string;
    platformIcon: string;
    platformColor: string;
    uploader: string | null;
    uploader_url: string | null;
    thumbnail: string | null;
    duration: number | null;
    duration_string: string | null;
    view_count: number | null;
    like_count: number | null;
    upload_date: string | null;
    extractor: string | null;
    webpage_url: string;
}

interface VideoFormat {
    format_id: string;
    quality: string;
    resolution: string | null;
    fps: number;
    size_mb: number | null;
    ext: string;
    has_audio: boolean;
}

interface AudioFormat {
    format_id: string;
    quality: string;
    size_mb: number | null;
    ext: string;
    abr: number;
}

interface DownloadOptions {
    video: VideoFormat[];
    audio: AudioFormat[];
}

interface AnalyzeResponse {
    success: boolean;
    metadata: MediaMetadata;
    download_options: DownloadOptions;
    error?: string;
}

interface DownloadProgress {
    id: string;
    status: 'starting' | 'downloading' | 'merging' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    speed: string | null;
    eta: string | null;
    downloadUrl: string | null;
    error: string | null;
}
import { getApiBaseUrl, getApiFileUrl, isBackendConfigured } from '@/lib/apiConfig';

// Dynamic API base URL - auto-detects local vs public access
const API_BASE = getApiBaseUrl();

const formatNumber = (num: number | null | undefined): string => {
    if (!num) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Platform icons are now handled by BrandIcons component

export const DownloadSection = () => {
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [mediaInfo, setMediaInfo] = useState<AnalyzeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
    const [audioOnly, setAudioOnly] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setUrl(text);
            toast.success('URL pasted from clipboard');
        } catch {
            toast.error('Failed to read clipboard');
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!url.trim()) {
            toast.error('Please enter a URL');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setMediaInfo(null);
        setSelectedFormat(null);

        try {
            const response = await fetch(`${API_BASE}/api/media/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to analyze URL');
            }

            setMediaInfo(data);

            // Auto-select best quality
            if (data.download_options?.video?.length > 0) {
                setSelectedFormat(data.download_options.video[0].format_id);
            }

            toast.success('Media analyzed successfully');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to analyze URL';
            setError(message);
            toast.error(message);
        } finally {
            setIsAnalyzing(false);
        }
    }, [url]);

    const handleDownload = useCallback(async () => {
        if (!url || !mediaInfo) return;

        // Immediately set downloading state to prevent double-clicks
        setDownloadProgress({
            id: 'pending',
            status: 'starting',
            progress: 0,
            speed: null,
            eta: null,
            downloadUrl: null,
            error: null,
        });

        try {
            const response = await fetch(`${API_BASE}/api/media/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    format_id: audioOnly ? null : selectedFormat,
                    audio_only: audioOnly,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to start download');
            }

            toast.info('Download started...');

            // Start SSE for progress tracking
            const eventSource = new EventSource(
                `${API_BASE}/api/media/download/${data.downloadId}/stream`
            );

            eventSource.onmessage = (event) => {
                const progress: DownloadProgress = JSON.parse(event.data);
                setDownloadProgress(progress);

                if (progress.status === 'completed' && progress.downloadUrl) {
                    eventSource.close();
                    toast.success('Download complete! File saved to your Downloads folder.');

                    // Silent background download using hidden iframe
                    // This prevents video from opening in browser
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = `${API_BASE}${progress.downloadUrl}`;
                    document.body.appendChild(iframe);

                    // Cleanup iframe after download starts
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 5000);

                    // Reset UI after delay
                    setTimeout(() => setDownloadProgress(null), 3000);
                } else if (progress.status === 'failed') {
                    eventSource.close();
                    toast.error(progress.error || 'Download failed');
                    setTimeout(() => setDownloadProgress(null), 5000);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                setDownloadProgress(prev => prev ? {
                    ...prev,
                    status: 'failed',
                    error: 'Connection lost'
                } : null);
            };

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Download failed';
            setDownloadProgress({
                id: 'error',
                status: 'failed',
                progress: 0,
                speed: null,
                eta: null,
                downloadUrl: null,
                error: message,
            });
            toast.error(message);
            setTimeout(() => setDownloadProgress(null), 5000);
        }
    }, [url, mediaInfo, selectedFormat, audioOnly]);

    const handleCancelDownload = useCallback(async () => {
        if (!downloadProgress?.id) return;

        try {
            await fetch(`${API_BASE}/api/media/download/${downloadProgress.id}`, {
                method: 'DELETE',
            });
            setDownloadProgress(null);
            toast.info('Download cancelled');
        } catch {
            toast.error('Failed to cancel download');
        }
    }, [downloadProgress]);

    const resetState = () => {
        setMediaInfo(null);
        setError(null);
        setSelectedFormat(null);
        setDownloadProgress(null);
    };

    return (
        <div className="space-y-6">
            {/* URL Input Section */}
            <Card className="border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                        <Link2 className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Media Link Downloader</CardTitle>
                    <CardDescription className="text-base">
                        Paste a video or image link from YouTube, TikTok, Instagram, Twitter, and more
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="https://youtube.com/watch?v=..."
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    if (mediaInfo) resetState();
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                className="pr-10 h-12 text-base"
                                disabled={isAnalyzing}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={handlePaste}
                                title="Paste from clipboard"
                            >
                                <Clipboard className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !url.trim()}
                            className="h-12 px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Analyze
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Platform badges with brand icons */}
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {['YouTube', 'TikTok', 'Instagram', 'Twitter', 'Facebook', 'Vimeo'].map((platform) => {
                            const config = getPlatformConfig(platform);
                            return (
                                <Badge
                                    key={platform}
                                    variant="secondary"
                                    className="text-xs flex items-center gap-1.5 px-3 py-1"
                                >
                                    <PlatformIcon platform={platform} size={14} />
                                    {platform}
                                </Badge>
                            );
                        })}
                        <Badge variant="outline" className="text-xs">
                            +100 more
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="flex items-center gap-3 py-4">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Media Info Display */}
            {mediaInfo && (
                <Card className="overflow-hidden">
                    <div className="grid md:grid-cols-[300px_1fr] gap-0">
                        {/* Thumbnail */}
                        <div className="relative aspect-video md:aspect-auto bg-muted">
                            {mediaInfo.metadata.thumbnail ? (
                                <img
                                    src={mediaInfo.metadata.thumbnail}
                                    alt={mediaInfo.metadata.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Video className="h-12 w-12 text-muted-foreground" />
                                </div>
                            )}
                            {mediaInfo.metadata.duration_string && (
                                <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {mediaInfo.metadata.duration_string}
                                </Badge>
                            )}
                            <Badge
                                className="absolute top-2 left-2 flex items-center gap-1.5"
                                style={{ backgroundColor: mediaInfo.metadata.platformColor }}
                            >
                                <PlatformIcon platform={mediaInfo.metadata.platform} size={14} className="text-white" />
                                {mediaInfo.metadata.platform}
                            </Badge>
                        </div>

                        {/* Info */}
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                                {mediaInfo.metadata.title}
                            </h3>

                            {mediaInfo.metadata.uploader && (
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                    <User className="h-4 w-4" />
                                    <span>{mediaInfo.metadata.uploader}</span>
                                    {mediaInfo.metadata.uploader_url && (
                                        <a
                                            href={mediaInfo.metadata.uploader_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                {mediaInfo.metadata.view_count !== null && (
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-4 w-4" />
                                        <span>{formatNumber(mediaInfo.metadata.view_count)} views</span>
                                    </div>
                                )}
                                {mediaInfo.metadata.like_count !== null && (
                                    <div className="flex items-center gap-1">
                                        <Heart className="h-4 w-4" />
                                        <span>{formatNumber(mediaInfo.metadata.like_count)} likes</span>
                                    </div>
                                )}
                                {mediaInfo.metadata.duration !== null && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{formatDuration(mediaInfo.metadata.duration)}</span>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-4" />

                            {/* Download Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Download Options</h4>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="audio-only"
                                            checked={audioOnly}
                                            onCheckedChange={setAudioOnly}
                                        />
                                        <Label htmlFor="audio-only" className="flex items-center gap-1">
                                            <Music className="h-4 w-4" />
                                            Audio Only
                                        </Label>
                                    </div>
                                </div>

                                {!audioOnly ? (
                                    <ScrollArea className="h-[200px] pr-4">
                                        <div className="space-y-2">
                                            {mediaInfo.download_options.video.map((format) => (
                                                <div
                                                    key={format.format_id}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedFormat === format.format_id
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                    onClick={() => setSelectedFormat(format.format_id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileVideo className="h-5 w-5 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium">{format.quality}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {format.resolution} • {format.fps}fps • {format.ext.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {format.size_mb && (
                                                            <Badge variant="outline">{format.size_mb} MB</Badge>
                                                        )}
                                                        {!format.has_audio && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                No Audio
                                                            </Badge>
                                                        )}
                                                        {selectedFormat === format.format_id && (
                                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <ScrollArea className="h-[200px] pr-4">
                                        <div className="space-y-2">
                                            {mediaInfo.download_options.audio.length > 0 ? (
                                                mediaInfo.download_options.audio.map((format) => (
                                                    <div
                                                        key={format.format_id}
                                                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <FileAudio className="h-5 w-5 text-muted-foreground" />
                                                            <div>
                                                                <div className="font-medium">{format.quality}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {format.ext.toUpperCase()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {format.size_mb && (
                                                            <Badge variant="outline">{format.size_mb} MB</Badge>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">
                                                    Audio will be extracted from the best available source
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}

                                {/* Download Button */}
                                {!downloadProgress ? (
                                    <Button
                                        onClick={handleDownload}
                                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        disabled={!audioOnly && !selectedFormat}
                                    >
                                        <Download className="mr-2 h-5 w-5" />
                                        {audioOnly ? 'Download Audio (MP3)' : 'Download Video'}
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Status Header */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium flex items-center gap-2">
                                                {downloadProgress.status === 'starting' && (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                        <span className="text-blue-500">Preparing download...</span>
                                                    </>
                                                )}
                                                {downloadProgress.status === 'downloading' && (
                                                    <>
                                                        <Download className="h-4 w-4 animate-pulse text-green-500" />
                                                        <span className="text-green-500">Downloading...</span>
                                                    </>
                                                )}
                                                {downloadProgress.status === 'merging' && (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                                        <span className="text-orange-500">Processing...</span>
                                                    </>
                                                )}
                                                {downloadProgress.status === 'completed' && (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        <span className="text-green-600">Download Complete!</span>
                                                    </>
                                                )}
                                                {downloadProgress.status === 'failed' && (
                                                    <>
                                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                                        <span className="text-red-500">Download Failed</span>
                                                    </>
                                                )}
                                            </span>
                                            <span className="font-bold">{Math.round(downloadProgress.progress)}%</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <Progress
                                            value={downloadProgress.progress}
                                            className={`h-3 ${downloadProgress.status === 'completed' ? 'bg-green-100' :
                                                downloadProgress.status === 'failed' ? 'bg-red-100' : ''
                                                }`}
                                        />

                                        {/* Speed & ETA */}
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            {downloadProgress.speed && <span>Speed: {downloadProgress.speed}</span>}
                                            {downloadProgress.eta && <span>ETA: {downloadProgress.eta}</span>}
                                        </div>

                                        {/* Completed Message */}
                                        {downloadProgress.status === 'completed' && (
                                            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                                                <p className="text-green-700 font-medium">
                                                    ✅ Your file is downloading in your browser!
                                                </p>
                                                <p className="text-green-600 text-xs mt-1">
                                                    Check your Downloads folder
                                                </p>
                                            </div>
                                        )}

                                        {/* Error Message */}
                                        {downloadProgress.status === 'failed' && downloadProgress.error && (
                                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                                                <p className="text-red-600 text-sm">
                                                    {downloadProgress.error}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDownloadProgress(null)}
                                                    className="mt-2"
                                                >
                                                    Try Again
                                                </Button>
                                            </div>
                                        )}

                                        {/* Cancel Button (only during active download) */}
                                        {['starting', 'downloading', 'merging'].includes(downloadProgress.status) && (
                                            <Button
                                                variant="outline"
                                                onClick={() => setDownloadProgress(null)}
                                                className="w-full"
                                                disabled
                                            >
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Please wait...
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};
