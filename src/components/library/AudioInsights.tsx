import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { cn } from '@/lib/utils';
import { Scissors, Volume2, Clock, Loader2 } from 'lucide-react';

interface AudioInsightsProps {
    audioUrl: string;
    duration: number;
    trimStart: number;
    trimEnd: number;
    onSuggestTrim?: () => void;
    onSuggestVolume?: () => void;
}

interface InsightBadgeProps {
    icon: React.ReactNode;
    label: string;
    variant: 'warning' | 'info';
    onClick?: () => void;
}

const InsightBadge = ({ icon, label, variant, onClick }: InsightBadgeProps) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
            onClick && 'cursor-pointer hover:scale-105',
            !onClick && 'cursor-default',
            variant === 'warning' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            variant === 'info' && 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
        )}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const AudioInsights = ({
    audioUrl,
    duration,
    trimStart,
    trimEnd,
    onSuggestTrim,
    onSuggestVolume,
}: AudioInsightsProps) => {
    const insights = useAudioAnalysis(audioUrl, duration, trimStart, trimEnd);

    // Don't show anything while analyzing or if no insights
    if (insights.isAnalyzing) {
        return (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyzing...</span>
            </div>
        );
    }

    if (!insights.isAnalyzed) {
        return null;
    }

    // Collect relevant insights (max 2)
    const badges: React.ReactNode[] = [];

    // Silence at start/end - suggest trimming
    if (insights.hasSilenceAtStart || insights.hasSilenceAtEnd) {
        badges.push(
            <InsightBadge
                key="silence"
                icon={<Scissors className="h-2.5 w-2.5" />}
                label="Has silence"
                variant="warning"
                onClick={onSuggestTrim}
            />
        );
    }

    // Low volume - suggest normalization
    if (insights.isLowVolume) {
        badges.push(
            <InsightBadge
                key="volume"
                icon={<Volume2 className="h-2.5 w-2.5" />}
                label="Low volume"
                variant="warning"
                onClick={onSuggestVolume}
            />
        );
    }

    // Duration warnings (info only)
    if (insights.isVeryShort) {
        badges.push(
            <InsightBadge
                key="short"
                icon={<Clock className="h-2.5 w-2.5" />}
                label="<10s"
                variant="info"
            />
        );
    }

    if (insights.isVeryLong) {
        badges.push(
            <InsightBadge
                key="long"
                icon={<Clock className="h-2.5 w-2.5" />}
                label=">30min"
                variant="info"
            />
        );
    }

    // Show max 2 insights to avoid noise
    const visibleBadges = badges.slice(0, 2);

    if (visibleBadges.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {visibleBadges}
        </div>
    );
};
