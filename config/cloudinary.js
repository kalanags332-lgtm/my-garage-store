const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim()
});

// Store files in memory then stream to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'home-items-shop', transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }] },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    );
    Readable.from(buffer).pipe(stream);
  });
}

async function destroyCloudinaryImage(url) {
  const parts = url.split('/');
  const fileWithExt = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const publicId = `${folder}/${fileWithExt.replace(/\.[^.]+$/, '')}`;
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { upload, uploadToCloudinary, destroyCloudinaryImage };
