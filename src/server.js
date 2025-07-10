const express = require('express');
const http = require('http');
const cors = require('cors');
const joinZoomService = require('./jobs/joinZoom.job');
const fs = require('fs');
const openaiService = require('../src/services/openai-service');
const rabbitmqService = require('../src/services/rabbitmq-service');
const recordingService = require('../src/logic/recording-service');
const sharedMemoryService = require('./util/sharedMemoryService');

process.on('unhandledRejection', (reason, promise) => {
    console.log("unhandledRejection!");
    console.log(reason);
    if (reason.message !== undefined && reason.message.includes("Target closed")) {
        console.log("puppeteer || puppeteer stream attempted to access closed browser (possibly unhandled puppeteer-stream WebSocket message after close). " +
            "Ignoring, but this need to be addressed later!");
        process.exit(0);
    } else {
        process.exit(1);
    }
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

const PORT = 8000;
const server = http.createServer(app);

rabbitmqService.connectAndConsume();

app.get("/", async (req, res) => {
    return res.send({status: 200, msg: 'succesfully got it!'});
});

app.post('/remove-notetakers', async (req, res) => {
    console.log('POST /remove-notetakers', req.body);

    try {
        await recordingService.removeNotetaker(req.body);
        return res.sendStatus(200)
    } catch (e) {
        console.log(e);
        return res.status(400).send({status: 400, msg: 'something went wrong!'});
    }
});

app.get('/readiness', (req, res) => {
    //const isReady = sharedMemoryService.getReadiness();
    const isReady = true;
    if (isReady) {
        res.send('Ready');
    } else {
        res.status(500).send('Not Ready');
    }
});

app.get('/liveness', (req, res) => {
    res.send('Alive');
});

app.get('/started', (req, res) => {
    res.send('Started');
});

function fetchSummaryFromFile(path) {
    return new Promise((r) => {
        if (fs.existsSync(path)) {
            fs.readFile(path, 'utf8', (e, summary) => {
                if (e) {
                    console.log(`failed to fetch summary for path: ${path}`, e);
                    return r({summary: null, success: false});
                }

                return r({summary, success: true});
            })
        } else return r({summary: null, success: false});
    });
}

//testing the stage
server.listen(PORT, () => {
    console.log("Server is up and running at port:" + PORT);
    console.log("got next environment variables");
    console.log("DUTIFY_ZOOM_MEETING_URL: " + process.env.DUTIFY_ZOOM_MEETING_URL);
    console.log("DUTIFY_CALL_INSTANCE_ID: " + process.env.DUTIFY_CALL_INSTANCE_ID);
    console.log("DUTIFY_SELECTED_LIST_ID//IGNORE: " + process.env.DUTIFY_SELECTED_LIST_ID);
    let request = {};
    request.meetingUrl = process.env.DUTIFY_ZOOM_MEETING_URL;
    request.callInstanceId = process.env.DUTIFY_CALL_INSTANCE_ID;
    request.selectedListId = process.env.DUTIFY_SELECTED_LIST_ID;
    try {
        joinZoomService.startZoomJob(request);
    } catch (e) {
        console.log("UNHANDLED EXCEPTION IN JOB");
        console.log(e);
        process.exit(1);
    }
});


