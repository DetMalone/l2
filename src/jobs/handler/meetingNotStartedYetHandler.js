async function _meetingNotStartedYetHandler(context) {
    if (!context.meetingNotStartYetTimeout) {
        console.log('setting timeout for meeting not started yet event with the limit:', context.MEETING_NOT_STARTED_YET_LIMIT);

        context.meetingNotStartYetTimeout = setTimeout(async () => {
            if (!context.isInWaitingRoom && !context.isJoinSuccess) {
                console.log('meeting not started yet timeout limit exceeded, exiting...');
                context.browser.close();
            } else console.log('meeting has started, clear timeout');
        }, context.MEETING_NOT_STARTED_YET_LIMIT);
    }

    let timeout
    try {
        timeout = setTimeout(async () => {
            clearTimeout(timeout);

            let joiningWindow = await context.page.evaluate(() => {
                return document.getElementById('websdk-password')?.innerText;
            });

            if (joiningWindow?.includes('Meeting has not started')) {
                console.log('Host has not joined yet, reloading...');
                context.page.reload();
            } else {
                console.log('Page is not on joining window, clearing timeout.');
                clearTimeout(timeout);
            }
        }, 10000);
    } catch (error) {
        clearTimeout(timeout);
        console.log('error occurred in joining window', error);
        context.browser.close();
    }
}

module.exports = {
    _meetingNotStartedYetHandler,
}