const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { CLOUDFLARE_R2 } = require('./env');

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

const PLACEHOLDER_VALUES = new Set([
  'your_account_id',
  'your_access_key_id',
  'your_secret_access_key',
  'your_bucket_name',
  'your_r2_access_key_id',
  'your_r2_secret_access_key',
  'your_r2_bucket_name'
]);

let runtimeCloudflareConfig = {
  accountId: CLOUDFLARE_R2.accountId,
  accessKeyId: CLOUDFLARE_R2.accessKeyId,
  secretAccessKey: CLOUDFLARE_R2.secretAccessKey,
  bucketName: CLOUDFLARE_R2.bucketName,
  publicUrl: CLOUDFLARE_R2.publicUrl,
  folder: CLOUDFLARE_R2.folder
};

let cachedS3Client = null;
let cachedClientKey = '';

function configureCloudflare(customConfig = {}) {
  if (typeof customConfig.accountId === 'string' && customConfig.accountId.trim()) {
    runtimeCloudflareConfig.accountId = customConfig.accountId.trim();
  }
  if (typeof customConfig.accessKeyId === 'string' && customConfig.accessKeyId.trim()) {
    runtimeCloudflareConfig.accessKeyId = customConfig.accessKeyId.trim();
  }
  if (typeof customConfig.secretAccessKey === 'string' && customConfig.secretAccessKey.trim()) {
    runtimeCloudflareConfig.secretAccessKey = customConfig.secretAccessKey.trim();
  }
  if (typeof customConfig.bucketName === 'string' && customConfig.bucketName.trim()) {
    runtimeCloudflareConfig.bucketName = customConfig.bucketName.trim();
  }
  if (customConfig.publicUrl !== undefined) {
    runtimeCloudflareConfig.publicUrl = String(customConfig.publicUrl || '')
      .trim()
      .replace(/\/+$/, '');
  }
  if (typeof customConfig.folder === 'string' && customConfig.folder.trim()) {
    runtimeCloudflareConfig.folder = customConfig.folder.trim();
  }
}

function isCloudflareConfigured() {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = runtimeCloudflareConfig;
  return Boolean(
    accountId &&
      accessKeyId &&
      secretAccessKey &&
      bucketName &&
      !PLACEHOLDER_VALUES.has(accountId.toLowerCase()) &&
      !PLACEHOLDER_VALUES.has(accessKeyId.toLowerCase()) &&
      !PLACEHOLDER_VALUES.has(secretAccessKey.toLowerCase()) &&
      !PLACEHOLDER_VALUES.has(bucketName.toLowerCase())
  );
}

function getR2Client() {
  if (!isCloudflareConfigured()) return null;
  const { accountId, accessKeyId, secretAccessKey } = runtimeCloudflareConfig;
  const nextKey = `${accountId}|${accessKeyId}|${secretAccessKey}`;
  if (!cachedS3Client || cachedClientKey !== nextKey) {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    cachedClientKey = nextKey;
  }
  return cachedS3Client;
}

function getCloudflareStatus() {
  return {
    configured: isCloudflareConfigured(),
    accountId: runtimeCloudflareConfig.accountId || null,
    bucketName: runtimeCloudflareConfig.bucketName || null,
    publicUrl: runtimeCloudflareConfig.publicUrl || null,
    folder: runtimeCloudflareConfig.folder || 'apex_shareholder_portal',
    mode: isCloudflareConfigured() ? 'cloudflare-r2' : 'local-storage-ready-for-cloudflare'
  };
}

async function uploadToCloudflare(fileBuffer, originalName, mimeType, subFolder = 'general') {
  configureCloudflare();
  const rawExt = path.extname(originalName || '').toLowerCase();
  const safeExt = rawExt || '.bin';
  const cleanSubFolder = String(subFolder || 'general')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const baseName =
    path
      .basename(originalName || 'file', rawExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'file';
  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (isCloudflareConfigured()) {
    try {
      const cleanFolder = String(runtimeCloudflareConfig.folder || 'apex_shareholder_portal')
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-zA-Z0-9_/-]/g, '_');
      const objectKey = [cleanFolder, cleanSubFolder, `${baseName}_${uniqueSuffix}${safeExt}`]
        .filter(Boolean)
        .join('/');

      const client = getR2Client();
      await client.send(
        new PutObjectCommand({
          Bucket: runtimeCloudflareConfig.bucketName,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream'
        })
      );

      const url = runtimeCloudflareConfig.publicUrl
        ? `${runtimeCloudflareConfig.publicUrl}/${objectKey}`
        : `/uploads/r2/${objectKey}`;

      return {
        url,
        publicId: objectKey,
        provider: 'cloudflare-r2',
        format: safeExt.replace('.', ''),
        bytes: fileBuffer.length,
        originalName
      };
    } catch (err) {
      console.warn('Cloudflare R2 upload failed, falling back to local storage:', err.message);
    }
  }

  // Fallback local storage so file/image uploads always succeed even before R2 keys are entered
  const fileName = `${cleanSubFolder}_${baseName}_${uniqueSuffix}${safeExt}`;
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

async function getCloudflareObject(objectKey) {
  const client = getR2Client();
  if (!client) return null;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: runtimeCloudflareConfig.bucketName,
      Key: objectKey
    })
  );

  const byteArray = await response.Body.transformToByteArray();
  return {
    buffer: Buffer.from(byteArray),
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || byteArray.length
  };
}

module.exports = {
  UPLOADS_DIR,
  configureCloudflare,
  isCloudflareConfigured,
  getCloudflareStatus,
  uploadToCloudflare,
  getCloudflareObject
};
