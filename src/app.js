import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const upload = multer({ dest: UPLOAD_DIR });  // Set upload destination, multer initialized here and it uploads file to disk

async function processImage(imagePath) {
  try {
    console.log('processImage: reading', imagePath);
    const image = await Jimp.read(imagePath);
    console.log('processImage: image loaded');
    return image;
  } catch (err) {
    console.error('processImage: Error reading image:', err);
    throw err;
  }
}

app.post('/resize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const width = parseInt(req.body.width, 10);
    const height = parseInt(req.body.height, 10);
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      return res.status(400).json({ error: 'width and height must be positive integers' });
    }

    const imagePath = req.file.path;
    const outputPath = path.join(UPLOAD_DIR, `resized_${req.file.filename}.jpg`);

    console.log('Attempting to read image:', imagePath);
    const image = await processImage(imagePath);

    await image
      .resize(width, height) // older Jimp versions use (width, height)  actual resize happens here
      .quality(80)
      .writeAsync(outputPath);

    console.log('Image resized and saved to:', outputPath);

    const absoluteOutput = path.resolve(outputPath);
    res.sendFile(absoluteOutput, {}, (sendErr) => {
      try { fs.unlinkSync(imagePath); } catch (_) {}
      try { fs.unlinkSync(outputPath); } catch (_) {}
      if (sendErr) console.error('sendFile error:', sendErr);
    });
  } catch (err) {
    console.error('Unhandled /resize error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
