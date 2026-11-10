const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const os = require('os');
const { CLOUDINARY } = require('./env');
const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'apex_portal_uploads')
  : path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Ignore on read-only serverless filesystems
}

let runtimeCloudinaryConfig = {
  cloud_name: CLOUDINARY.cloud_name,
  api_key: CLOUDINARY.api_key,
  api_secret: CLOUDINARY.api_secret,
  folder: CLOUDINARY.folder
};

function configureCloudinary(customConfig = {}) {
  if (customConfig.cloud_name !== undefined) runtimeCloudinaryConfig.cloud_name = customConfig.cloud_name;
  if (customConfig.api_key !== undefined) runtimeCloudinaryConfig.api_key = customConfig.api_key;
  if (customConfig.api_secret !== undefined) runtimeCloudinaryConfig.api_secret = customConfig.api_secret;
  if (customConfig.folder !== undefined) runtimeCloudinaryConfig.folder = customConfig.folder;

  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: runtimeCloudinaryConfig.cloud_name,
      api_key: runtimeCloudinaryConfig.api_key,
      api_secret: runtimeCloudinaryConfig.api_secret,
      secure: true
    });
  }
}

function isCloudinaryConfigured() {
  const { cloud_name, api_key, api_secret } = runtimeCloudinaryConfig;
  return Boolean(
    cloud_name &&
    api_key &&
    api_secret &&
    cloud_name !== 'your_cloud_name' &&
    api_key !== 'your_api_key'
  );
}

function getCloudinaryStatus() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: runtimeCloudinaryConfig.cloud_name || null,
    folder: runtimeCloudinaryConfig.folder || 'apex_shareholder_portal',
    mode: isCloudinaryConfigured() ? 'cloudinary-cloud' : 'local-storage-ready-for-cloudinary'
  };
}

async function uploadToCloudinary(fileBuffer, originalName, mimeType, subFolder = 'general') {
  configureCloudinary();
  const safeExt = path.extname(originalName || '') || '.bin';
  const baseName = path
    .basename(originalName || 'file', safeExt)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (isCloudinaryConfigured()) {
    try {
      const folderPath = `${runtimeCloudinaryConfig.folder}/${subFolder}`;
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            public_id: `${baseName}_${uniqueSuffix}`,
            resource_type: 'auto'
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        uploadStream.end(fileBuffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        provider: 'cloudinary',
        format: result.format || safeExt.replace('.', ''),
        bytes: result.bytes || fileBuffer.length,
        originalName
      };
    } catch (err) {
      console.warn('Cloudinary upload failed, falling back to local storage:', err.message);
    }
  }

  // Fallback local storage so file/image uploads always succeed even before Cloudinary keys are entered
  const fileName = `${subFolder}_${baseName}_${uniqueSuffix}${safeExt}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, fileBuffer);

  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    provider: 'local-fallback',
    format: safeExt.replace('.', ''),
    bytes: fileBuffer.length,
    originalName
  };
}

module.exports = {
  cloudinary,
  UPLOADS_DIR,
  configureCloudinary,
  isCloudinaryConfigured,
  getCloudinaryStatus,
  uploadToCloudinary
};
