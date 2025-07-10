const { startZoomJob } = require('./src/jobs/joinZoom.job');
const { MEETING_URL, BOT_NAME } = require('./config');

(() => {
    const data = {
        meetingUrl: MEETING_URL,
        botName: BOT_NAME
    }

    console.log('data', data);
    console.log('trigger zoom job!!');
    startZoomJob(data);
})();