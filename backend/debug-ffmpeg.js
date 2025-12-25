const ffmpeg = require('ffmpeg-static');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('FFmpeg Path:', ffmpeg);

if (fs.existsSync(ffmpeg)) {
    console.log('✅ FFmpeg binary exists.');

    // Try running it
    const proc = spawn(ffmpeg, ['-version']);

    proc.stdout.on('data', (data) => {
        console.log('Output:', data.toString().split('\n')[0]);
    });

    proc.stderr.on('data', (data) => {
        console.error('Error:', data.toString());
    });

    proc.on('close', (code) => {
        console.log('FFmpeg exit code:', code);
    });
} else {
    console.error('❌ FFmpeg binary NOT found at path.');
}
