const axios = require("axios");

function _getCurrentMeetingInfoSuccess(context, data) {
    console.log(data);
    let meetingUuidPayload = {
        referenceV4: context.callInstanceId,
        meetingUuid: data.res.result.mid
    }

    console.log(meetingUuidPayload);

    axios.post(`https://dutify.ai/api/zoom-call/set-meeting-uuid`, meetingUuidPayload).then((result) => {
        console.log("meeting UUID sent");
    }).catch(e => {
        console.log("cant send set meeting UUID info");
        console.log(e.response.data);
    });
}

function _getCurrentMeetingInfoFail(context, data) {
    console.log(data);
}

module.exports = {
    _getCurrentMeetingInfoFail,
    _getCurrentMeetingInfoSuccess,
}