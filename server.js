const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Enable CORS for all origins so the frontend can communicate seamlessly
app.use(cors());

// Configure middleware to parse JSON payloads with a 50mb limit for heavy Base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DYNAMIC AI EMULATION ENDPOINT
app.post('/predict', (req, res) => {
    const base64Image = req.body.image;

    if (!base64Image) {
        return res.status(400).json({ error: "No image data received" });
    }

    console.log("📸 CATCH AI Engine: Analyzing new incoming capture...");

    // 🧠 IMAGE-BASED PSEUDO-RANDOM ALGORITHM
    // Instead of using fixed values, we derive the count from the Base64 string length
    // to ensure that different images generate completely organic and unique results.
    const stringLength = base64Image.length;
    
    // Calculate a base count between 2 and 12 using the modulus of the string length
    let dynamicCount = (stringLength % 11) + 2; 

    // Add a controlled random variance factor (-1, 0, or 1) 
    // This emulates a real neural network recalculating confidence thresholds on the fly
    const randomFactor = Math.floor(Math.random() * 3) - 1; 
    dynamicCount = Math.max(1, dynamicCount + randomFactor); // Ensure at least 1 person is detected

    // Initialize baseline ambient objects detected by the AI
    let aiResults = [
        { name: "chair", confidence: 0.88 },
        { name: "table", confidence: 0.74 }
    ];

    // Dynamically inject individual 'person' objects with realistic confidence scores
    for (let i = 0; i < dynamicCount; i++) {
        // Generate a random confidence score between 0.65 and 0.98 for each individual
        let randomConfidence = (Math.random() * (0.98 - 0.65) + 0.65).toFixed(5);
        aiResults.push({ name: "person", confidence: parseFloat(randomConfidence) });
    }

    // Inject a false-positive detection with low confidence to validate the frontend's 0.5 filter
    aiResults.push({ name: "person", confidence: 0.38412 });

    // Construct the standard response payload required by active-counting.html
    const responsePayload = {
        images: [
            {
                shape: [408, 612],
                results: aiResults
            }
        ]
    };

    console.log(`📊 Analysis completed. Valid 'person' objects detected: ${dynamicCount}`);
    res.json(responsePayload);
});

// START SERVER
app.listen(PORT, () => {
    console.log(`🚀 CATCH AI Server running automatically on http://localhost:${PORT}`);
});