const {_meetingDisconnectedHandler} = require("./meetingDisconnectedHandler");

async function _inWaitingRoomHandler(context) {
    clearTimeout(context.meetingNotStartYetTimeout);
    context.isInWaitingRoom = true;
    context.wasInWaitingRoom = true;

    if (context.isCapturing) {
        console.log('Putted in the waiting room by host while recording the meeting, exiting...');
        _meetingDisconnectedHandler(context);
    }
}

module.exports = {
    _inWaitingRoomHandler: _inWaitingRoomHandler,
}