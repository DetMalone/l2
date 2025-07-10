const {OPENAI_KEY} = require('../../config');
const {Configuration, OpenAIApi} = require("openai");
const fs = require("fs");

const configuration = new Configuration({
    apiKey: OPENAI_KEY
});
const openai = new OpenAIApi(configuration);


async function transcribeAudio(filepath) {
    //console.log('transcribing audio...');

    const transcript = await openai.createTranscription(
        fs.createReadStream(filepath),
        "whisper-1",
        undefined,
        'json',
        0,
        "en"
    );
    console.log("transcription server answer: "+transcript);
    //console.log('transcription completed', transcript.data.text);
    return transcript.data.text;
}


module.exports = {
    transcribeAudio
}