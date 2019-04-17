const express = require("express");
const router = express.Router();
const stream = require('stream');
const crypto = require('crypto');
const format = require('util').format;

const googleTts = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');
const GOOGLE_STORAGE_BUCKET_NAME = process.env.GOOGLE_STORAGE_BUCKET_NAME;

const storage = new Storage();
const bucket = storage.bucket(GOOGLE_STORAGE_BUCKET_NAME);

router.post('/', (req, res) => {
    const request = req.body.request;
    const hash = crypto.createHash('md5').update(JSON.stringify(request)).digest('hex');
    const filename = hash + ".mp3";
    const path = "ttsaudio/" + filename;
    const bfile = bucket.file(path);
    const url = "https://storage.googleapis.com/" + GOOGLE_STORAGE_BUCKET_NAME + "/" + path;

    bfile.exists((err, exists) => {
        if (err) {
            console.error('ERROR:', err);
            res.status(400).json({ error: "Error checking if file " + path + " exists in bucket " + err });
            return;
        } else if (exists) {
            console.log("BUCKET FILE EXISTS ", path);
            res.json({ url: url, created: 0 });
            return;
        } else {
            const client = new googleTts.TextToSpeechClient();
            // Performs the Text-to-Speech request
            client.synthesizeSpeech(request, (err, response) => {
                if (err) {
                    console.error('ERROR 1:', err);
                    res.status(400).json({ error: "Google Cloud unable to synthesize speech from SSML" });
                    return;
                }
                // Write the binary audio content to a local file

                console.log("SYNTHESIZED SPEECH SUCCESSFULLY");
                bfile.save(response.audioContent, function (err) {
                    if (!err) {
                        console.log('Audio content written to BUCKET: ' + "." + path);
                        res.json({ url: url, created: 1 });
                        return;
                    } else {
                        res.status(500).json({ error: "Unable to save file to bucket: " + path });
                        return;
                    }
                });
            })
        }
    })

});




module.exports = router;