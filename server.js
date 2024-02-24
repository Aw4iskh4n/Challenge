const express = require('express');
const Datastore = require('nedb');
const CryptoJS = require('crypto-js');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Required for file system operations
const app = express();
const port = 3001;

// Initialize the database
const db = new Datastore({ filename: 'imageDatabase.db', autoload: true });

// Middleware
app.use(express.static('public')); // Serve static files
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Secret key for AES decryption
const secretKey = CryptoJS.enc.Hex.parse('165a547310ddf1dd83b6826f7313344c');

// Endpoint to add a new image
app.get('/add-image', (req, res) => {
    let encryptedImageSrc = req.query.src; // Extract 'src' from query parameters

    if (encryptedImageSrc) {
        // Replace URL-safe Base64 characters back to the original
        encryptedImageSrc = encryptedImageSrc.replace(/-/g, '+').replace(/_/g, '/');

        try {
            // Decrypt and decode the image src
            const bytes = CryptoJS.AES.decrypt(encryptedImageSrc, secretKey, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            const decryptedImageSrc = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedImageSrc) {
                return res.status(400).send('Invalid encrypted data');
            }

            // Add the new image src to the database
            db.insert({ src: decryptedImageSrc }, (err) => {
                if (err) return res.status(500).send('Database error');
                res.redirect('/'); 
            });
        } catch (e) {
            return res.status(400).send('Decryption failed: ' + e.message);
        }
    } else {
        res.status(400).send('No image source provided');
    }
});

app.get('/images', (req, res) => {
    db.find({}, (err, docs) => {
        if (err) return res.status(500).send('Database error');
        res.json(docs); 
    });
});


const hiddenDirectory = path.join(__dirname, 'backup');


app.use(express.json());


app.post('/backup', (req, res) => {
    fs.readdir(hiddenDirectory, (err, files) => {
        if (err) {
            console.error('Error reading the backup directory:', err);
            return res.status(500).send('Error accessing the backup directory');
        }
        res.json(files); 
    });
});


app.post('/backup/server.config', (req, res) => {
    const secretFilePath = path.join(hiddenDirectory, 'server.config'); 

    fs.readFile(secretFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return res.status(404).send('File not found');
        }
        res.send(data);
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
