const logScreenshot = require("../../util/screenshotlogging");

async function _joinFailedHandler(context, data) {
    await logScreenshot.log('joinFailedScreenshot', context.page);
    console.log(data);
    throw data?.res?.errorMessage || 'join failed';
}

module.exports = {
    _joinFailedHandler,
}