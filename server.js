const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---- конфиг через env
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'dev-local-key';
const MAX_MB = Number(process.env.MAX_FILE_SIZE_MB || 200); // 200MB

// ---- простая аутентификация
app.use((req, res, next) => {
  const key = req.header('X-API-Key');
  if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
});

// ---- загрузка файла (в /tmp)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `in-${uuidv4()}${path.extname(file.originalname || '')}`)
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024 }
});

// ---- здоровье
app.get('/health', (_, res) => res.json({ ok: true }));

// ---- вспомогалки
async function downloadToTemp(url) {
  const out = path.join(os.tmpdir(), `in-${uuidv4()}.bin`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  const fileStream = fs.createWriteStream(out);
  await new Promise((resolve, reject) => {
    resp.body.pipe(fileStream);
    resp.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
  return out;
}

function ffmpegConvert(inputPath, outputPath, format) {
  const args = ['-y', '-i', inputPath, '-vn'];
  if (format === 'wav') args.push('-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2');
  else args.push('-acodec', 'libmp3lame', '-b:a', '192k'); // mp3 по умолчанию
  args.push(outputPath);
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
  });
}

async function safeUnlink(file) {
  try { await fsp.unlink(file); } catch (_) {}
}

// ---- основной эндпоинт
// Вариант А: multipart/form-data c полем 'file'
// Вариант Б: JSON { "url": "https://..." }
app.post('/convert', upload.single('file'), async (req, res) => {
  const format = (req.query.format || 'mp3').toLowerCase(); // mp3|wav
  if (!['mp3', 'wav'].includes(format)) return res.status(400).json({ error: 'format must be mp3 or wav' });

  let inputPath;
  try {
    if (req.file) {
      inputPath = req.file.path; // пришёл загруженный файл
    } else if (req.is('application/json') && req.body?.url) {
      inputPath = await downloadToTemp(req.body.url); // скачиваем по URL
    } else {
      return res.status(400).json({ error: "Provide file (multipart 'file') or JSON {url}" });
    }

    const outName = `out-${uuidv4()}.${format}`;
    const outputPath = path.join(os.tmpdir(), outName);
    await ffmpegConvert(inputPath, outputPath, format);

    const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
    const stream = fs.createReadStream(outputPath);
    stream.on('close', async () => {
      await safeUnlink(inputPath);
      await safeUnlink(outputPath);
    });
    stream.pipe(res);
  } catch (err) {
    await safeUnlink(inputPath || '');
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`ffmpeg-converter listening on ${PORT}`);
});
