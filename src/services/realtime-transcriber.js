const {createClient, LiveTranscriptionEvents} = require("@deepgram/sdk");
require("dotenv").config();
const fs = require("fs");
const {v4: uuidv4} = require("uuid");
const axios = require("axios");

const DEEPGRAM_KEY = "5b9914d93cdac0546906bd324ec568f214004fff";

const deepgram = createClient(DEEPGRAM_KEY);

const options = {
    model: "nova-2",
    language: "en",
    smart_format: true,
    utterances: true,
    interim_results: true,
    utterance_end_ms: 1000,
    keywords:["Dutify"]
};

let endBuffers = false; // for triggering the end of stream

let liveTranscription;

// final content of the transcript
const transcript = {
    content: "",
};

const initializeTranscription = (callInstanceId) => {
    liveTranscription = deepgram.listen.live(options);

    const keepAlive = setInterval(() => {
        if (liveTranscription.getReadyState() === 1) {
            console.warn(`Deepgram alive`);
            liveTranscription.keepAlive();
        } else {
            clearInterval(keepAlive);
        }
    }, 30000);

    liveTranscription.on(LiveTranscriptionEvents.Open, () => {
        console.warn(`Deepgram connection opened`);
    });

    liveTranscription.on(LiveTranscriptionEvents.Close, () => {
        console.warn(`Deepgram connection closed`);
        clearInterval(keepAlive);
    });

    liveTranscription.on(LiveTranscriptionEvents.Transcript, async (data) => {
        const currentTranscriptBit = data.channel.alternatives[0].transcript.trim();

        if (data.is_final) {
            try {
                console.log("Transcription: " + currentTranscriptBit);
                let realtimeResponse = await axios.post(`https://dutify.ai/api/recording/transcription/realtime`, {
                    referenceV4: callInstanceId,
                    transcriptionPart: currentTranscriptBit
                });
            } catch (e) {
                console.log("something went wrong in realtime processing");

                if (e.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log('Error Response:', {
                        status: e.response.status,
                        statusText: e.response.statusText,
                        headers: e.response.headers,
                        data: e.response.data,
                    });
                } else if (e.request) {
                    // The request was made but no response was received
                    console.log('No Response:', e.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error Message:', e.message);
                }

                console.log('Error Config:', e.config);
            }
        }

        // if there is any end trigger you can use this condition and use the final transcript
        if (endBuffers && data.is_final) {
            console.log("Transcript is finished", transcript.content);
        }
    });

    liveTranscription.on(LiveTranscriptionEvents.Error, (err) => {
        console.error(`Deepgram error for client:`, err);
    });
};

const transcribeAudioChunk = (chunk) => {
    if (liveTranscription.getReadyState() === 1) {
        liveTranscription.send(chunk);
    } else {
        console.error("Deepgram connection is not open");
    }
};

const makeBufferEnd = () => {
    // the function is used to make the end of stream
    endBuffers = true;
    if (liveTranscription) {
        liveTranscription.finish(); // Finish the live transcription session
    }
};

module.exports = {
    initializeTranscription,
    transcribeAudioChunk,
    makeBufferEnd,
};