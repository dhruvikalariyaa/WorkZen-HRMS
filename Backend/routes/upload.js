import express from 'express';
import jwt from 'jsonwebtoken';
import { upload, deleteImage, extractPublicId } from '../config/cloudinary.js';
import { authenticate, authorize } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Upload image (single file)
router.post('/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    res.json({
      success: true,
      imageUrl: req.file.path,
      publicId: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload employee profile image
router.post('/employee/:employeeId', authenticate, authorize('Admin', 'HR Officer'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { employeeId } = req.params;

    // Get existing employee to check for old image
    const employeeResult = await pool.query(
      'SELECT profile_image_url FROM employees WHERE id = $1',
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      // Delete uploaded image if employee doesn't exist
      await deleteImage(extractPublicId(req.file.path));
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete old image if exists
    if (employeeResult.rows[0].profile_image_url) {
      const oldPublicId = extractPublicId(employeeResult.rows[0].profile_image_url);
      await deleteImage(oldPublicId);
    }

    // Update employee with new image URL
    const updateResult = await pool.query(
      'UPDATE employees SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [req.file.path, employeeId]
    );

    res.json({
      success: true,
      imageUrl: req.file.path,
      employee: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Upload employee image error:', error);
    res.status(500).json({ error: 'Failed to upload employee image' });
  }
});

// Upload company logo (Public during registration, Admin for updates)
router.post('/company/logo', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get existing company info to check for old logo
    const companyResult = await pool.query('SELECT logo_url FROM company_info LIMIT 1');

    // Delete old logo if exists
    if (companyResult.rows.length > 0 && companyResult.rows[0].logo_url) {
      const oldPublicId = extractPublicId(companyResult.rows[0].logo_url);
      await deleteImage(oldPublicId);
    }

    // Check if user is authenticated (for updates after registration)
    const token = req.headers.authorization?.split(' ')[1];
    let isAdmin = false;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
        isAdmin = userResult.rows[0]?.role === 'Admin';
      } catch (error) {
        // Invalid token - allow public upload during registration
      }
    }

    // Update or insert company logo
    const existingCompany = await pool.query('SELECT id FROM company_info LIMIT 1');
    
    if (existingCompany.rows.length > 0) {
      // If company exists and user is not Admin, deny update (unless it's during registration)
      if (token && !isAdmin) {
        return res.status(403).json({ error: 'Only Admin can update company logo' });
      }
      
      // Update logo (either Admin or public during registration)
      await pool.query(
        'UPDATE company_info SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [req.file.path, existingCompany.rows[0].id]
      );
    } else {
      // Create new company with logo (public registration)
      await pool.query(
        'INSERT INTO company_info (company_name, logo_url, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        ['WorkZen', req.file.path]
      );
    }

    res.json({
      success: true,
      imageUrl: req.file.path
    });
  } catch (error) {
    console.error('Upload company logo error:', error);
    res.status(500).json({ error: 'Failed to upload company logo' });
  }
});

// Delete image
router.delete('/image', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const publicId = extractPublicId(imageUrl);
    const result = await deleteImage(publicId);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;

