function _userJoinHandler(context, data) {
    console.log("on user join", data?.res);

    if (context.wasInWaitingRoom) {
        if (!context.joinSuccessTimeout) {
            console.log('on join user event called, setting timeout of %s  for join success event', context.JOIN_SUCCESS_TIMEOUT);
            context.joinSuccessTimeout = setTimeout(() => {
                console.log('time limit exceeded for join success event, reloading context.page...');
                context.page.reload()
            }, context.JOIN_SUCCESS_TIMEOUT);
        }
    } else console.log('was not in waiting room', context.wasInWaitingRoom);
}

module.exports = {
    _userJoinHandler,
}