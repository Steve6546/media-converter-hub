const fs = require('fs');
const path = require('path');

const STUDIO_ROOT_DIR = path.join(__dirname, '..', '..');
const STUDIO_UPLOADS_DIR = path.join(STUDIO_ROOT_DIR, 'studio-uploads');
const STUDIO_OUTPUT_DIR = path.join(STUDIO_ROOT_DIR, 'studio-output');
const STUDIO_TEMP_DIR = path.join(STUDIO_ROOT_DIR, 'studio-temp');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const ensureStudioDirs = () => {
  [STUDIO_UPLOADS_DIR, STUDIO_OUTPUT_DIR, STUDIO_TEMP_DIR].forEach(ensureDir);
};

module.exports = {
  STUDIO_UPLOADS_DIR,
  STUDIO_OUTPUT_DIR,
  STUDIO_TEMP_DIR,
  ensureStudioDirs,
};
