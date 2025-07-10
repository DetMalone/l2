const {launch} = require("puppeteer-stream");
const fs = require("fs");
const sharedMemoryService = require("../util/sharedMemoryService");
const {v4: uuidv4} = require('uuid');
const jsonUtil = require('../util/json-util');
const {_meetingDisconnectedHandler} = require("./handler/meetingDisconnectedHandler");
const {_joinSuccessHandler} = require("./handler/joinSuccessHandler");
const {_inWaitingRoomHandler} = require("./handler/inWaitingRoomHandler");
const {_meetingNotStartedYetHandler} = require("./handler/meetingNotStartedYetHandler");
const {_joinPermissionNotGrantedHandler} = require("./handler/joinPermissionNotGrantedHandler");
const {_chatMessageHandler} = require("./handler/chatMessageHandler");
const {_joinFailedHandler} = require("./handler/joinFailedHandler");
const {_userJoinHandler} = require("./handler/userJoinHandler");
const {_getCurrentMeetingInfoFail, _getCurrentMeetingInfoSuccess} = require("./handler/getCurrentMeetingHandler");

const context = {}

async function startZoomJob(data) {
    console.log("starting job");
    sharedMemoryService.setReadiness(false);

    let zoomUrl = data.meetingUrl;
    context.callInstanceId = data.callInstanceId;
    context.meetingId = zoomUrl?.split("/")?.[4]?.split("?")[0];
    let processingDisconnection = false;

    if (!context.meetingId || !zoomUrl) {
        console.log('meetingId or zoom url is invalid', data);
        return;
    }

    let botName = data?.botName || 'Dutify.AI';
//    let zoomPageUrl = `https://aa4f-52-87-224-198.ngrok-free.app/platform/zoom?url=${zoomUrl}&botName=${botName}`;
    let zoomPageUrl = `http://localhost:3000/platform/zoom?url=${zoomUrl}&botName=${botName}`;


    console.log("start zoom job for Url", zoomUrl);
    console.log("full url: " + zoomPageUrl);
    console.log("version: 1.1.14");

    let executablePath;
    if (process.env.REACT_APP_LOCAL_START) {
        executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
        executablePath = "/usr/bin/google-chrome-stable";
        //    executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    }

    context.browser = await launch({
        defaultViewport: null,
        executablePath: executablePath,
        ignoreDefaultArgs: [
            "--enable-automation",
            "--mute-audio",
        ],
        args: [
            "--disable-gpu",
            "--start-maximized",
            "--window-size=800,600",
        ]
    });

    /* zoom websdk works only on localhost or https, not http. So if we`d need to change l1 to separate, then we need to uncomment this line
    giving permissions for a specific domain. Browser argument --fake-ui not working, as it is not handled by puppeteer-stream
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('http://localhost:3000', ['microphone','camera']);
    await context.overridePermissions('https://aa4f-52-87-224-198.ngrok-free.app', ['microphone','camera']);*/

    context.browser.on('disconnected', async () => {
        console.log('Browser disconnected');
        // process.exit(0);
    });

    let noEventRecievedTimeout;
    context.page = await context.browser.newPage();
    await context.page
        .goto(zoomPageUrl)
        .then(() => {
            console.log('zoom context.page open success', zoomPageUrl);
            console.log('setting timeout for event recieved');

            noEventRecievedTimeout = setTimeout(() => {
                console.log('No event recieved, reloading the context.page to start the process again...');
                context.page.reload();
            }, 30000);
            //transcribeItB();
        })
        .catch(async (err) => {
            console.log("navigation exception");
            console.log(err);
            context.browser.close();
        });

    console.log("pre pre create recording file stream 2");
    let logText;
    console.log("pre create recording file stream");
    context.file = fs.createWriteStream(`/jobs/${context.meetingId}-recording.webm`);
    console.log("after create recording file stream");
    context.notetakerStatusRecord = fs.createWriteStream(`/jobs/storage/${context.meetingId}-${context.callInstanceId}-status.txt`);
    context.isJoinSuccess = false;
    context.wasInWaitingRoom = false;
    context.isInWaitingRoom = false;
    context.isCapturing = false;
    context.joinSuccessTimeout = null;
    context.meetingNotStartYetTimeout = null;
    context.recordingStarted = false;
    context.statusFileWatcher = null;

    let isWatcherInstalled = false;
    while (!isWatcherInstalled) {
        if (fs.existsSync(context.notetakerStatusRecord.path)) {
            console.log('status file watcher installed!!!');
            context.statusFileWatcher = fs.watch(context.notetakerStatusRecord.path, (event) => {
                console.log('change detected in status file!');
                if (event === 'change') {
                    fs.readFile(context.notetakerStatusRecord.path, 'utf8', async (err, data) => {
                        if (err) {
                            console.error(err);
                            return;
                        }

                        console.log('notetaker status update', data);
                        if (data?.includes("remove-notetaker")) {
                            try {
                                if (!processingDisconnection) {
                                    processingDisconnection = true;
                                    const leaveBtn = await context.page.waitForXPath('//*[@id="foot-bar"]/div[3]/button')
                                    await leaveBtn.click();

                                    const leaveMeetingBtn = await context.page.waitForXPath('//!*[@id="wc-footer"]/div[2]/div[2]/div[3]/div/div/button');
                                    await leaveMeetingBtn.click();
                                    _meetingDisconnectedHandler(context);
                                }
                            } catch (e) {
                            }
                        }
                    });
                }
            });
            isWatcherInstalled = true;
        }

        await new Promise((r) => setTimeout(() => r(), 2000));
    }

    context.MEETING_DURATION_LIMIT = 60000 * 120; // 2hrs;
    context.JOIN_SUCCESS_TIMEOUT = 45000 // 45 sec
    context.MEETING_NOT_STARTED_YET_LIMIT = 60000 * 60 * 5; // 5hrs

    // read logs from zoom meeting context.page
    context.page.on('console', async (log) => {
        try {
            logText = log.text();
            _zoomInMeetingEventListener('ON_USER_JOIN', (data) => {
                _userJoinHandler(context, data)
            });
            _zoomInMeetingEventListener('JOIN_SUCCESS', () => {
                _joinSuccessHandler(context)
            });
            _zoomInMeetingEventListener('JOIN_FAILED', (data) => {
                _joinFailedHandler(context, data)
            });
            _zoomInMeetingEventListener('MEETING_DISCONNECTED', () => {
                _meetingDisconnectedHandler(context);
            });
            _zoomInMeetingEventListener('MEETING_NOT_STARTED_YET', () => {
                _meetingNotStartedYetHandler(context)
            });
            _zoomInMeetingEventListener('IN_WAITING_ROOM', () => {
                _inWaitingRoomHandler(context)
            });
            _zoomInMeetingEventListener('JOIN_PERMISSION_NOT_GRANTED', () => {
                _joinPermissionNotGrantedHandler(context)
            });
            _zoomInMeetingEventListener('CHAT_MESSAGE', (data) => {
                _chatMessageHandler(context, data)
            });
            _zoomInMeetingEventListener('GET_CURRENT_MEETING_INFO_SUCCESS', (data) => {
                _getCurrentMeetingInfoSuccess(context, data)
            });
            _zoomInMeetingEventListener('GET_CURRENT_MEETING_INFO_FAIL', (data) => {
                _getCurrentMeetingInfoFail(context, data)
            });
        } catch (error) {
            console.log('ERR', error);
            context.browser.close();
        }
    });


    function _zoomInMeetingEventListener(event, handler) {
        if (!logText.includes(event)) return;

        if (noEventRecievedTimeout) {
            console.log('Event recieved, clear event recieved timeout');
            clearTimeout(noEventRecievedTimeout);
            noEventRecievedTimeout = null;
        }

        console.log("zoom-event", event);
        const str = logText.replace(event, '');
        const res = jsonUtil.parseJSONFromEventStr(str);
        handler({event, res});
    }
}


module.exports = {
    startZoomJob
}
