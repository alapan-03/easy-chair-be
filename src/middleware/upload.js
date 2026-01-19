const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const UPLOAD_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const orgId = req.tenant?.orgId || 'unknown';
        const submissionId = req.params?.id || 'unknown';
        const dir = path.join(UPLOAD_DIR, `org_${orgId}`, 'submissions', submissionId);

        // Create directory if it doesn't exist
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter - only allow PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

module.exports = upload;
