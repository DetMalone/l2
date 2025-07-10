
async function _chatMessageHandler(context, data) {
    console.log('chat message', data);

    const message = data?.res?.chatMessage;
    console.log('incoming message', message);
}

module.exports = {
    _chatMessageHandler,
}