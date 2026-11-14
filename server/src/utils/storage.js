/**
 * File storage abstraction.
 * - With Cloudinary credentials: streams the in-memory buffer to Cloudinary.
 * - Without them (local demo): writes to /uploads and serves via Express static.
 * Callers always get back { url, publicId, originalName, mimeType, size, provider }.
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const cloudinary = require('../config/cloudinary');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

function uploadBufferToCloudinary(file, subfolder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${env.cloudinary.folder}/${subfolder}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

async function saveLocally(file, subfolder) {
  const dir = path.join(UPLOAD_DIR, subfolder);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.writeFile(path.join(dir, name), file.buffer);
  return { url: `/uploads/${subfolder}/${name}`, publicId: `${subfolder}/${name}` };
}

async function storeFiles(files = [], subfolder = 'complaints') {
  const saved = [];
  for (const file of files) {
    if (env.useCloudinary) {
      const r = await uploadBufferToCloudinary(file, subfolder);
      saved.push({
        url: r.secure_url,
        publicId: r.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        provider: 'cloudinary',
      });
    } else {
      const r = await saveLocally(file, subfolder);
      saved.push({
        ...r,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        provider: 'local',
      });
    }
  }
  return saved;
}

async function removeFiles(files = []) {
  await Promise.all(
    files.map(async (f) => {
      try {
        if (f.provider === 'cloudinary' && env.useCloudinary) {
          await cloudinary.uploader.destroy(f.publicId);
        } else if (f.provider === 'local') {
          await fs.unlink(path.join(UPLOAD_DIR, f.publicId));
        }
      } catch {
        /* a missing file should never block a delete */
      }
    })
  );
}

module.exports = { storeFiles, removeFiles, UPLOAD_DIR };
