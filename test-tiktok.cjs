const { downloadMedia } = require('./backend/src/media-downloader/index.js');
const fs = require('fs');

const url = 'https://www.tiktok.com/@r1zzy2dr1zzy/video/7587160899492826390';

console.log('Testing TikTok Download...');

try {
    const { downloadId, process } = downloadMedia(url, null, { audioOnly: true });

    process.stdout.on('data', (data) => {
        const line = data.toString();
        if (line.includes('[download]')) {
            console.log('STDOUT:', line.trim());
        }
    });

    process.stderr.on('data', (data) => {
        console.error('STDERR:', data.toString());
    });

    process.on('close', (code) => {
        console.log('Process exited with code:', code);
        if (code === 0) {
            console.log('✅ TikTok Audio Download Success!');
        } else {
            console.error('❌ TikTok Audio Download Failed!');
        }
    });
} catch (err) {
    console.error('Execution failed:', err.message);
}
