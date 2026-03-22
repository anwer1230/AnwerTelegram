const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// تأكد من وجود مجلد uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد تخزين multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // الحفاظ على الاسم الأصلي مع إضافة طابع زمني لتجنب التعارض
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // حد أقصى 100 ميغابايت
});

// خدمة الملفات الثابتة (واجهة HTML)
app.use(express.static(path.join(__dirname, 'public')));

// API: رفع ملف
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم إرسال ملف' });
    }
    res.json({
        message: 'تم الرفع بنجاح',
        filename: req.file.filename,
        originalName: req.file.originalname
    });
});

// API: عرض قائمة الملفات
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'خطأ في قراءة المجلد' });
        }
        const fileList = files.map(file => {
            const stats = fs.statSync(path.join(uploadDir, file));
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime
            };
        });
        res.json(fileList);
    });
});

// API: تحميل ملف
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                res.status(500).json({ error: 'خطأ في التحميل' });
            }
        });
    } else {
        res.status(404).json({ error: 'الملف غير موجود' });
    }
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});