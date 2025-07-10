const ffmpeg = require('fluent-ffmpeg');
const  openAIService = require("./openai-service");
const fs = require("fs");
const path = require("node:path");


async function transcribeAudioByFixedChunks(filePath, chunkDuration = 600) {
    console.log("Transcribing audio in fixed-size chunks: " + filePath);

    const transcripts = [];
    let startTime = 0;
    let transcriptionComplete = false;

    while (!transcriptionComplete) {
        try {
            const chunkPath = await extractAudioChunk(filePath, startTime, chunkDuration);
            const transcript = await openAIService.transcribeAudio(chunkPath);
            transcripts.push(transcript);
            fs.unlinkSync(chunkPath); // Clean up chunk file after transcription

            startTime += chunkDuration;

            // If the last chunk is shorter than the chunkDuration, we assume we've reached the end
            if (transcript.trim() === '') {
                transcriptionComplete = true;
            }
        } catch (error) {
            console.error(`Error during transcription of chunk starting at ${startTime} seconds:`);
            transcriptionComplete = true;
        }
    }

    return transcripts.join(' ');
}


async function extractAudioChunk(filePath, startTime, duration) {
    const outputPath = path.join(__dirname, `chunk_${startTime}.mp3`);

    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .setStartTime(startTime)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', err => reject(err))
            .run();
    });
}

// Example usage:
async function processAudioFile(filePath) {
    try {
        const transcripts = await transcribeAudioByFixedChunks(filePath);
        console.log('Transcription:', transcripts);
        return transcripts;
    } catch (error) {
        console.error('Error during transcription:', error);
    }
}

module.exports = {
    processAudioFile,
}