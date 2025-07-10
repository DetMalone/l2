const realtimeTranscriber = require("../../services/realtime-transcriber");
const {uploadFileToS3} = require("../../services/aws-service");
const audioTranscriber = require("../../services/audio-transcription-service");
const axios = require("axios");
const sharedMemoryService = require("../../util/sharedMemoryService");
const fs = require("fs");

async function _meetingDisconnectedHandler(context) {
    console.log('meeting end', context.recordingStarted);

    try {
        clearTimeout(context.meetingTimeout);
        context.file?.close();
        await context.stream?.destroy();
        realtimeTranscriber.makeBufferEnd();

        if (context.recordingStarted) {
            console.log('recording available, generate insights');

            const now = new Date().getTime();
            const fileName = `${context.meetingId}-recording-${now}.webm`,
                fileDir = `recordings/${context.meetingId}/recording-${now}`;
            const awsObjectInfo = await uploadFileToS3(context.file, fileName, fileDir);
            console.log('recording file uploaded successfully', awsObjectInfo);

            const transcripts = await audioTranscriber.processAudioFile(context.file.path);
            let processResponse = await axios.post(`https://dutify.ai/api/zoom-call/process`, {
                callInstanceId: context.callInstanceId,
                transcripts: transcripts
            }).catch(e => console.log(e));
            if (processResponse.status) {
                console.log("process request sent, status: " + processResponse.status);
            } else {
                console.log("no status from process request")
            }
            sharedMemoryService.setReadiness(true);
            if (context.statusFileWatcher != null) context.statusFileWatcher.close();

            fs.unlinkSync(context.file.path);
            fs.unlinkSync(context.notetakerStatusRecord.path);
            process.exit(0);
        }
    } catch (error) {
        console.log(error);
    } finally {
        await context.browser.close();
    }
}

module.exports = {
    _meetingDisconnectedHandler,
}
