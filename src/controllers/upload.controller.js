import { Readable } from 'node:stream';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validates actual binary image signatures (magic bytes).
 * Supports JPEG, PNG, GIF, and WEBP.
 * Returns the detected MIME type, or null if invalid/unsupported.
 */
function detectImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // 1. JPEG: starts with 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // 2. PNG: starts with 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. GIF: starts with 'GIF87a' or 'GIF89a'
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'image/gif';
  }

  // 4. WEBP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

/**
 * POST /api/upload/image (Protected: verifyToken)
 * Securely uploads an image to ImgBB and returns the hosted URL.
 * Validates actual file bytes, prevents MIME spoofing, and enforces size boundaries.
 */
export async function uploadImage(req, res) {
  try {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Image upload service configuration is missing.',
      });
    }

    let buffer = null;
    let declaredMime = null;
    let originalName = 'upload';

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      try {
        const webReq = new Request('http://localhost', {
          method: 'POST',
          headers: req.headers,
          body: Readable.toWeb(req),
          duplex: 'half',
        });
        const formData = await webReq.formData();
        const file = formData.get('image') || formData.get('file');

        if (!file || typeof file === 'string') {
          return res.status(400).json({
            success: false,
            message: 'No image file uploaded. Expected form field: "image" or "file".',
          });
        }

        // Enforce 5MB limit before loading buffer
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return res.status(400).json({
            success: false,
            message: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB.`,
          });
        }

        if (file.size < 12) {
          return res.status(400).json({
            success: false,
            message: 'Uploaded file is empty or too small to be a valid image.',
          });
        }

        declaredMime = (file.type || '').toLowerCase();
        originalName = file.name || 'image';

        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Failed to parse multipart form data: ' + err.message,
        });
      }
    } else if (req.body && (req.body.image || req.body.file)) {
      const rawImage = req.body.image || req.body.file;

      if (typeof rawImage !== 'string' || !rawImage.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Expected base64 string or data URL.',
        });
      }

      const trimmed = rawImage.trim();
      let base64Data = trimmed;

      if (trimmed.startsWith('data:')) {
        const dataUrlMatch = trimmed.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!dataUrlMatch) {
          return res.status(400).json({
            success: false,
            message: 'Malformed data URL. Expected format: data:<mime>;base64,<data>',
          });
        }
        declaredMime = dataUrlMatch[1].toLowerCase();
        base64Data = dataUrlMatch[2].trim();
      } else if (req.body.mimeType) {
        declaredMime = req.body.mimeType.toLowerCase();
      }

      // Strict base64 format check (standard base64 alphabet and valid padding)
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data) || base64Data.length % 4 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 encoding.',
        });
      }

      buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length < 12) {
        return res.status(400).json({
          success: false,
          message: 'Image payload is empty or too small to be a valid image.',
        });
      }

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB.`,
        });
      }

      if (req.body.name && typeof req.body.name === 'string') {
        originalName = req.body.name.trim();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image provided. Please send a multipart file or base64 JSON payload.',
      });
    }

    // Validate declared MIME type whitelist if declared
    if (declaredMime && !ALLOWED_MIME_TYPES.includes(declaredMime)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type '${declaredMime}'. Allowed formats: JPEG, PNG, WEBP, GIF.`,
      });
    }

    // Validate actual binary image magic bytes
    const detectedMime = detectImageMagicBytes(buffer);

    if (!detectedMime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file signature. Uploaded file is not a supported image (JPEG, PNG, GIF, WEBP).',
      });
    }

    // Verify declared MIME matches actual detected image signature (anti-spoofing)
    if (declaredMime) {
      const normalizedDeclared = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
      if (normalizedDeclared !== detectedMime) {
        return res.status(400).json({
          success: false,
          message: `MIME type mismatch: declared '${declaredMime}' does not match actual file signature '${detectedMime}'.`,
        });
      }
    }

    // Upload verified image to ImgBB API
    const imgbbForm = new FormData();
    imgbbForm.append('image', buffer.toString('base64'));
    imgbbForm.append('name', originalName.replace(/\.[^/.]+$/, ''));

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: imgbbForm,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('ImgBB API responded with failure status:', response.status);
      return res.status(502).json({
        success: false,
        message: result?.error?.message || 'Failed to upload image to external storage.',
      });
    }

    // Return hosted URL and safe metadata without exposing deleteUrl
    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      url: result.data.url,
      displayUrl: result.data.display_url,
      data: {
        url: result.data.url,
        displayUrl: result.data.display_url,
        title: result.data.title,
        size: result.data.size,
        mimeType: detectedMime,
      },
    });
  } catch (error) {
    console.error('Unexpected error during image upload:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing image upload.',
    });
  }
}
