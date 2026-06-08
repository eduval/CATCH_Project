const express = require('express');
const cors = require('cors');
const sharp = require('sharp'); 
const { spawn } = require('child_process'); 
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5000;

app.use(cors());

// Límites masivos en Express para que no bloquee nada en la entrada
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true, parameterLimit: 200000 }));

const MAX_FILE_SIZE_MB = 50;
const MIN_WIDTH = 224;
const MIN_HEIGHT = 224;

app.post('/predict', async (req, res) => {
    const base64Data = req.body.image;

    if (!base64Data) {
        return res.status(400).json({ error: "No image data received" });
    }

    // SI SE IMPRIME ESTO, EL FRONTEND YA LOGRÓ ENVIARLA COMPLETAMENTE:
    console.log("📸 CATCH AI Engine: Incoming image received. Processing data matrix...");

    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let imageBuffer = matches && matches.length === 3 ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');

        const fileSizeMB = imageBuffer.length / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            console.log(`❌ Validation Failed: File exceeds ${MAX_FILE_SIZE_MB}MB`);
            return res.status(200).json({ images: [{ shape: [0, 0], results: [], error: "File exceeds limit" }] });
        }

        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width;
        const height = metadata.height;

        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
            console.log(`❌ Validation Failed: Image too small (${width}x${height})`);
            return res.status(200).json({ images: [{ shape: [width, height], results: [], error: "Image too small" }] });
        }

        const tempFileName = `temp_${Date.now()}.jpg`;
        const tempFilePath = path.join(__dirname, tempFileName);

        // 🛠️ OPTIMIZACIÓN BACKEND: Redimensionamos la imagen pesada antes de guardarla para Python
        // Si mide más de 1200px, la encogemos manteniendo el aspecto. Esto acelera a YOLOv8 un 500%
        await sharp(imageBuffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .toFile(tempFilePath);

        console.log(`🧠 Launching YOLOv8 pipeline for optimized file: ${tempFileName}`);

        // Intentamos con 'python', si notas que no despierta cámbialo a 'py'
        const pythonProcess = spawn('python', ['yolo_detector.py', tempFilePath]);

        let pythonData = "";

        pythonProcess.stdout.on('data', (data) => {
            pythonData += data.toString();
        });

        // Habilitamos logs de error de Python para ver si algo falla internamente
        pythonProcess.stderr.on('data', (data) => {
            console.error(`⚠️ Python System Log: ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
            try {
                if (!pythonData.trim()) {
                    throw new Error("Python process closed without returning data.");
                }

                const aiInference = JSON.parse(pythonData);
                const personCount = aiInference.detected_objects.filter(obj => obj.name === 'person').length;
                console.log(`📊 AI Inference Complete: Detected ${personCount} real 'person' entities.\n`);

                res.json({
                    images: [{
                        shape: aiInference.dimensions,
                        results: aiInference.detected_objects
                    }]
                });

            } catch (err) {
                console.log("❌ Error processing AI data:", err.message);
                res.status(200).json({ images: [{ shape: [width, height], results: [], error: "AI pipeline failure" }] });
            } finally {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }
        });

    } catch (error) {
        console.log("❌ AI Engine Critical Error:", error.message);
        res.status(200).json({ images: [{ shape: [0, 0], results: [], error: "Corrupt structure" }] });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CATCH REAL AI Server running on http://localhost:${PORT}`);
});