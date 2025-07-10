const fs = require("fs");


async function removeNotetaker(removeNotetakerRequest) {
    try {
        const {callInstanceIdList, meetingId} = removeNotetakerRequest;

        for (const data of callInstanceIdList) {
            const filePath = `/jobs/storage/${meetingId}-${data.callInstanceId}-status.txt`;
            if (fs.existsSync(filePath)) {
                console.log('notetaker status updated for instanceId', data.callInstanceId);
                fs.writeFileSync(filePath, "remove-notetaker");
            }
        }
    } catch (e) {
        console.log(e);
    }

}

module.exports = {
    removeNotetaker
}