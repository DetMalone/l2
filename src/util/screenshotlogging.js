const {uploadFileToS3fromFilePath} = require("../services/aws-service");

async function log(name, page) {
    console.log("logging screenshot")
    try {
        await page.screenshot({
            path: '/jobs/storage/' + name + '.jpg'
        });
        await uploadFileToS3fromFilePath('/jobs/storage/' + name + '.jpg', name + '.jpg', 'thisisntdpublicbucket')
            .then(data => {
                console.log('Upload successful:', data.Location);
            })
            .catch(error => {
                console.error('An error occurred:', error);
            });
        console.log("screenshot uploaded");
    } catch (e) {
        console.log("failed to upload screenshot");
        console.log(e);
    }
}

module.exports = {
    log
}