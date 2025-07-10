function _joinPermissionNotGrantedHandler(context) {
    context.isInWaitingRoom = false;
    throw 'join permission not granted by the host';
}

module.exports = {
    _joinPermissionNotGrantedHandler: _joinPermissionNotGrantedHandler
}