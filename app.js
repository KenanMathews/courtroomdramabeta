const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { uploadToSupabase } = require('./supabase');
const { getTopicsFromDB } = require('./ai');
const path = require('path');
const { processMessage, getOpenRooms } = require('./rooms');
const { loadCharactersAndAnimations } = require('./gameState');
const { getAssetsInMemory }= require('./assetcontrol')
const WebSocket = require('ws');


const app = express();
const PORT = process.env.PORT || 8001;

const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk storage
});

const assetsCache = new Map();
const assetPath = "assets.zip";

// Serve index.html
app.get('/', (req, res) => {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        if (err) {
            res.status(500).send('Error loading index.html');
        } else {
            res.status(200).type('text/html').send(data);
        }
    });
});


app.get('/assets/:fileName(*)', async (req, res) => {
    const { fileName } = req.params;
    try {
      let assetsDir = assetsCache.get(assetPath);
      if (!assetsDir) {
        assetsDir = await getAssetsInMemory(assetPath)
        assetsCache.set(assetPath, assetsDir);
      }
      // Serve the requested file from the assetsDir
      const fileBuffer = assetsDir[fileName];
      const contentType = getContentType(fileName);
      res.setHeader('Content-Type', contentType);
      res.send(fileBuffer);
    } catch (err) {
      console.error(`Error serving ${fileName}:`, err);
      res.status(500).send('Internal Server Error');
    }
  });

// Function to determine MIME type based on file extension
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.mp3':
            return 'audio/mpeg';
        case '.ogg':
            return 'audio/ogg';
        case '.wav':
            return 'audio/wav';
        // Add more cases for other file types if needed
        default:
            return 'application/octet-stream'; // default MIME type
    }
}

// Serve test.js
app.get('/test2.js', (req, res) => {
    fs.readFile(path.join(__dirname, 'test2.js'), (err, data) => {
        if (err) {
            res.status(500).send('Error loading test.js');
        } else {
            res.status(200).type('application/javascript').send(data);
        }
    });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    // Get the uploaded file from memory
    const file = req.file;
    // Check if file is present
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // if(uploadToSupabase(file)){
    //     res.json({ message: 'File uploaded and stored in database successfully' });
    // }else{
    //     res.json({ message: 'File upload failed' });
    // }
    return res.status(400).json({ error: 'Unsupported method' });

  });
  

// Load the scene data from a JSON file
let sceneData;
try {
    sceneData = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
} catch (err) {
    console.error('Error loading scene data:', err);
    sceneData = [];
}

// Serve specific asset data
app.get('/asset-data', (req, res) => {
    let assetData;
    try {
        assetData = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));
    } catch (err) {
        console.error('Error loading asset data:', err);
        assetData = {};
    }
    const requestedAssets = req.query.assets.split(',');
    const assets = {};

    for (const asset of requestedAssets) {
        if (assetData[asset]) {
            assets[asset] = assetData[asset];
        } else {
            console.warn(`Unsupported asset key: ${asset}`);
        }
    }

    res.json(assets);
});

// Serve the character data
app.get('/get_open_rooms', (req, res) => {
    const witnessMode = req.query.witnessMode === 'true';
    const openRooms = getOpenRooms(witnessMode);
    res.json(openRooms);
  });

// Serve the character data
app.get('/load_characters', (req, res) => {
    res.json(loadCharactersAndAnimations());
});

app.get('/scenes', (req, res) => {
    res.json(sceneData);
});

app.get('/topics', async (req, res) =>{
    const topics = await getTopicsFromDB();
    res.json(topics);
});

// Start the server
const server = app.listen(PORT, () => {
    assetsDir = getAssetsInMemory(assetPath).then(res => {
        assetsCache.set(assetPath, res);
        console.log('Assets loaded from supabase:');
    }).catch(err => {
    console.error('Error loading assets:', err);
    });
    console.log(`Local CORS server running at http://localhost:${PORT}/`);
});

const wsServer = new WebSocket.Server({ server });

wsServer.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Handle WebSocket connections
wsServer.on('connection', (ws,req) => {
    console.log('WebSocket client connected');
    // Handle incoming WebSocket messages
    ws.on('message', async (message) => {
      try {
        const response = await processMessage(ws, message);
        if (response) {
          ws.send(response);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  
    // Handle WebSocket connection closure
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
