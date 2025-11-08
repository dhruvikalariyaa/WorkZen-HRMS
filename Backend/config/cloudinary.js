import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'workzen-hrms',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' }
      ],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    };
  }
});

// Create multer upload middleware
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Helper function to delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public_id from Cloudinary URL
export const extractPublicId = (url) => {
  if (!url) return null;
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
      // Get everything after 'upload' and before the file extension
      const publicIdWithVersion = parts.slice(uploadIndex + 1).join('/');
      const publicId = publicIdWithVersion.split('.')[0];
      return publicId;
    }
    // Fallback: try to extract from filename
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    return `workzen-hrms/${publicId}`;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};

export default cloudinary;

