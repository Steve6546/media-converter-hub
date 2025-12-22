// Gradient presets for auto-generated covers
const GRADIENT_PALETTES = [
    { from: '#667eea', to: '#764ba2' }, // Purple dream
    { from: '#f093fb', to: '#f5576c' }, // Pink sunset
    { from: '#4facfe', to: '#00f2fe' }, // Ocean blue
    { from: '#43e97b', to: '#38f9d7' }, // Fresh mint
    { from: '#fa709a', to: '#fee140' }, // Warm glow
    { from: '#a8edea', to: '#fed6e3' }, // Soft pastel
    { from: '#ff0844', to: '#ffb199' }, // Coral fire
    { from: '#30cfd0', to: '#330867' }, // Deep space
    { from: '#5ee7df', to: '#b490ca' }, // Lavender mist
    { from: '#d299c2', to: '#fef9d7' }, // Cream dream
];

/**
 * Generates a cover image with a gradient background and title text
 */
export function generateCoverImage(
    title: string,
    size = 512,
    paletteIndex?: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        // Select a palette (random if not specified)
        const palette = paletteIndex !== undefined
            ? GRADIENT_PALETTES[paletteIndex % GRADIENT_PALETTES.length]
            : GRADIENT_PALETTES[Math.floor(Math.random() * GRADIENT_PALETTES.length)];

        // Create diagonal gradient
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, palette.from);
        gradient.addColorStop(1, palette.to);

        // Fill background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add subtle noise/texture overlay
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < size; i += 4) {
            for (let j = 0; j < size; j += 4) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(i, j, 2, 2);
                }
            }
        }
        ctx.globalAlpha = 1;

        // Draw title text
        const displayTitle = title.length > 20 ? title.substring(0, 17) + '...' : title;

        // Calculate font size based on title length
        const baseFontSize = size * 0.12;
        const fontSize = title.length > 15 ? baseFontSize * 0.8 : baseFontSize;

        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw text with white color
        ctx.fillStyle = '#ffffff';

        // Word wrap if needed
        const words = displayTitle.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > size * 0.8 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        // Draw each line centered
        const lineHeight = fontSize * 1.3;
        const startY = size / 2 - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            ctx.fillText(line, size / 2, startY + index * lineHeight);
        });

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Convert to blob
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to generate cover image'));
            }
        }, 'image/png', 0.95);
    });
}

/**
 * Returns available gradient palette count
 */
export function getGradientPaletteCount(): number {
    return GRADIENT_PALETTES.length;
}

/**
 * Generates a preview data URL for a gradient palette
 */
export function getGradientPreviewStyle(paletteIndex: number): string {
    const palette = GRADIENT_PALETTES[paletteIndex % GRADIENT_PALETTES.length];
    return `linear-gradient(135deg, ${palette.from}, ${palette.to})`;
}
