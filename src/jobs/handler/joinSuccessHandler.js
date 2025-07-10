// records meeting and keep track of active speaker
const {_meetingDisconnectedHandler} = require("./meetingDisconnectedHandler");
const logScreenshot = require("../../util/screenshotlogging");
const {getStream} = require("puppeteer-stream");
const {PassThrough} = require("stream");
const realtimeTranscriber = require("../../services/realtime-transcriber");

async function _joinSuccessHandler(context) {
    try {
        context.isJoinSuccess = true;
        clearTimeout(context.meetingNotStartYetTimeout);
        clearTimeout(context.joinSuccessTimeout);

        if (context.isCapturing) {
            console.log('join success called while capturing.');
            return;
        }

        if (context.isInWaitingRoom) {
            console.log('Joining permission granted by host, clear waiting timeout');
        }

        // this makes sure call disconnects after 2hr
        context.meetingTimeout = setTimeout(() => {
            try {
                console.log('Meeting time limit reached, disconnecting...');
                _meetingDisconnectedHandler(context);
            } catch (error) {
                console.log(error);
                console.log('error in meeting timeout');
            }
        }, context.MEETING_DURATION_LIMIT);

        context.isCapturing = true;
        context.isInWaitingRoom = false;
        await logScreenshot.log("zmmtgRootSearch", context.page);
        await context.page.waitForXPath('//*[@id="zmmtg-root"]');
        await context.page.waitForTimeout(1500);
        // auto joins the audio, if failed audio will not be there!
        console.log("starting to await audio join")
        await _autoAudioJoin(context)
            .then(success => console.log('audio joined successfully', success))
            .catch(err => console.log(err));

        // wait for the dialog box to disappear
        await context.page.waitForTimeout(6000);

        // capture meeting stream and pipe it to the file
        context.stream = await getStream(context.page, {
            audio: true,
            video: true,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000,
            frameSize: 60
        });

        const passThrough = new PassThrough();
        context.stream.pipe(context.file);        // Directly pipe the main stream to the file
        context.stream.pipe(passThrough); // Pipe the main stream to passThrough

        realtimeTranscriber.initializeTranscription(context.callInstanceId);
        let buffer = Buffer.alloc(0);

        const CHUNK_SIZE = 16; // chunk size in bytes
        passThrough.on("data", async (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length >= CHUNK_SIZE) {
                realtimeTranscriber.transcribeAudioChunk(buffer);

                buffer = Buffer.alloc(0);
            }
        });

        console.log("recording started");
        context.recordingStarted = true;
    } catch (error) {
        context.isCapturing = false;
        console.log('ERR while capturing', error);
        context.browser.close();
    }
}

// auto joins the audio by clicking the join audio button
async function _autoAudioJoin(context) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await _joinAudio(context);
            return resolve(result);
        } catch (error) {
            console.log('error in auto audio join', error);
            return reject(false);
        }
    })
}

async function _joinAudio(context, retry = 15) {
    return new Promise(async (resolve, reject) => {
        if (retry < 1) {
            console.log('Maximum number of retries exceeded');
            return reject(false);
        }

        console.log(`retry no. ${retry}  to join audio`);

        try {
            await logScreenshot.log('joinAudioScreenshot', context.page);
            retry--;
            const joinAudioBtnselector = 'button.zm-btn.join-audio-by-voip__join-btn.zm-btn--primary.zm-btn__outline--white.zm-btn--lg';
            const joinAudioButton = await context.page.waitForXPath('//*[@id="voip-tab"]/div/button').catch((error) => console.log('joinAudioButton xpath error', error));
            console.log('selector:', joinAudioButton?.remoteObject().description);
            if (!joinAudioButton) {
                console.log('join audio button not found!');
                const openJoinAudioPanelBtn = await context.page.waitForXPath('//*[@id="foot-bar"]/div[1]/div[1]/button').catch((error) => console.log('openJoinAudioPanelBtn xpath error', error));
                await openJoinAudioPanelBtn?.click()?.catch((error) => console.log('openJoinAudioPanelBtn click error', error));
            }

            if (joinAudioButton?.remoteObject()?.description === (joinAudioBtnselector)) {
                console.log('join audio button is enabled, attempt to click...');
                try {
                    await joinAudioButton.click();
                    console.log('successfully audio join');
                    await logScreenshot.log('afterJoinAudioScreenshot', context.page);
                    return resolve(true);
                } catch (error) {
                    console.log('error occured clicking join audio', error);
                }
            } else console.log('join audio button is disabled');

            console.log('failed to join audio in this attempt, retry...');
            await context.page.waitForTimeout(3000);
            _joinAudio(retry)
                .then(resolve)
                .catch(reject);
        } catch (error) {
            console.log('error occurred in join audio', String(error));
            await context.page.waitForTimeout(3000);
            _joinAudio(retry)
                .then(resolve)
                .catch(reject);
        }
    });
}

module.exports = {
    _joinSuccessHandler
}