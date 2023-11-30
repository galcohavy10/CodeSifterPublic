// index.js
const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const app = express();
const PORT = 5000;

// body-parser setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

const siftController = require('./siftController.js');

async function onServerStart() {
    console.log(`Server is running on http://localhost:${PORT}`);

    // if needed one can test the siftController here
    // testSift(codebase = 'testCodebase', messagePrompt = 'testMessagePrompt');
}

async function testSift(codebase, messagePrompt) {

    const userCodeStyle = siftController.getRandomCodeSamples(codebase);
    const significantWords = await siftController.getSignificantWords(messagePrompt, [], userCodeStyle);
    console.log(significantWords);

   // Test getCodeChunksQuery
   const codeChunks = await siftController.getCodeChunksQuery(codebase, significantWords);
   if (codeChunks) {
       console.log('codeChunks: ', codeChunks);
   } else {
    console.log ('no code chunks found');
   }

    // Test getRelevantCodeChunks
    const relevantCodeChunks = await siftController.getRelevantCodeChunks(codeChunks, messagePrompt);
    console.log('relevantCodeChunks: ', relevantCodeChunks);

    console.log('getting final answer');
    const finalAnswer = await siftController.askCodingQuestion(relevantCodeChunks, messagePrompt);
    console.log('finalAnswer: ', finalAnswer);

    return finalAnswer;
}


app.post('/sift', async (req, res) => {
    console.log('POST /sift called');

    // Generate a unique identifier for this upload session
    const uploadId = uuidv4();
    const uploadDir = path.join('uploads', uploadId);

    // Ensure the directory exists
    fs.mkdirSync(uploadDir, { recursive: true });

    // Configure multer to save files to the unique directory and keep their original names
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    });

    const upload = multer({ storage: storage }).array('files');

    // Now handle the upload
    upload(req, res, async (err) => {
        if (err) {
            // Handle upload errors
            console.error(err);
            res.status(500).send('Upload failed');
            return;
        }

        console.log('Files uploaded successfully: ', req.files);

        // Now that the files are uploaded, call codebaseSift with the directory path
        const { promptMessage } = req.body;
        const response = await siftController.codebaseSift(uploadDir, promptMessage);
        
        // Send the response back to the client
        res.send(response);
    });

});

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

app.listen(PORT, onServerStart);
