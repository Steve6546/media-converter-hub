/**
 * Brand Icons for Social Media Platforms
 * Professional SVG icons for YouTube, TikTok, Instagram, Twitter, Facebook, Vimeo, etc.
 */

import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

export const YouTubeIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

export const TikTokIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
);

export const InstagramIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
);

export const TwitterIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export const FacebookIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

export const VimeoIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 003.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" />
    </svg>
);

export const TwitchIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
);

export const RedditIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
);

export const DailymotionIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M12.006 13.237c-1.387 0-2.474-1.18-2.474-2.66 0-1.42 1.097-2.649 2.484-2.649 1.436 0 2.482 1.18 2.482 2.659 0 1.42-1.104 2.65-2.492 2.65zm8.604-9.831A5.814 5.814 0 0 0 16.515 2c-2.334 0-4.139 1.164-5.084 2.955V2.014H7.38v13.453c0 1.99-1.16 3.165-2.84 3.165-.938 0-1.685-.328-2.146-.97L.008 20.627c.866 1.216 2.454 1.842 4.287 1.842 3.09 0 5.17-2.058 5.17-5.392v-.813c1.147 1.466 2.818 2.204 4.863 2.204 4.09 0 7.27-3.24 7.27-7.547 0-2.574-.997-4.924-2.988-6.515z" />
    </svg>
);

export const PinterestIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
);

export const LinkIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

// Platform configuration with brand colors
export const PLATFORM_CONFIG: Record<string, {
    icon: React.FC<IconProps>;
    color: string;
    bgColor: string;
    name: string;
}> = {
    youtube: {
        icon: YouTubeIcon,
        color: '#FF0000',
        bgColor: 'rgba(255, 0, 0, 0.1)',
        name: 'YouTube'
    },
    tiktok: {
        icon: TikTokIcon,
        color: '#000000',
        bgColor: 'rgba(0, 0, 0, 0.1)',
        name: 'TikTok'
    },
    instagram: {
        icon: InstagramIcon,
        color: '#E4405F',
        bgColor: 'rgba(228, 64, 95, 0.1)',
        name: 'Instagram'
    },
    twitter: {
        icon: TwitterIcon,
        color: '#000000',
        bgColor: 'rgba(0, 0, 0, 0.1)',
        name: 'X (Twitter)'
    },
    x: {
        icon: TwitterIcon,
        color: '#000000',
        bgColor: 'rgba(0, 0, 0, 0.1)',
        name: 'X (Twitter)'
    },
    facebook: {
        icon: FacebookIcon,
        color: '#1877F2',
        bgColor: 'rgba(24, 119, 242, 0.1)',
        name: 'Facebook'
    },
    vimeo: {
        icon: VimeoIcon,
        color: '#1AB7EA',
        bgColor: 'rgba(26, 183, 234, 0.1)',
        name: 'Vimeo'
    },
    twitch: {
        icon: TwitchIcon,
        color: '#9146FF',
        bgColor: 'rgba(145, 70, 255, 0.1)',
        name: 'Twitch'
    },
    reddit: {
        icon: RedditIcon,
        color: '#FF4500',
        bgColor: 'rgba(255, 69, 0, 0.1)',
        name: 'Reddit'
    },
    dailymotion: {
        icon: DailymotionIcon,
        color: '#0066DC',
        bgColor: 'rgba(0, 102, 220, 0.1)',
        name: 'Dailymotion'
    },
    pinterest: {
        icon: PinterestIcon,
        color: '#E60023',
        bgColor: 'rgba(230, 0, 35, 0.1)',
        name: 'Pinterest'
    },
};

/**
 * Get platform configuration from platform name
 */
export const getPlatformConfig = (platform: string) => {
    const p = platform.toLowerCase();

    for (const key of Object.keys(PLATFORM_CONFIG)) {
        if (p.includes(key)) {
            return PLATFORM_CONFIG[key];
        }
    }

    // Default fallback
    return {
        icon: LinkIcon,
        color: '#6B7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        name: platform || 'Link'
    };
};

/**
 * Platform icon component that renders the correct icon based on platform name
 */
export const PlatformIcon: React.FC<{ platform: string; className?: string; size?: number }> = ({
    platform,
    className = '',
    size = 16
}) => {
    const config = getPlatformConfig(platform);
    const IconComponent = config.icon;

    return <IconComponent className={className} size={size} />;
};
