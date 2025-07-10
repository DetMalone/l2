const AWS = require('aws-sdk');
const fs = require('fs');
const { AWS_KEY, AWS_REGION, AWS_SECRET, AWS_BUCKET } = require('../../config');

AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_KEY,
    secretAccessKey: AWS_SECRET,
});

AWS.config.getCredentials(function (err) {
    if (err) console.log(err.stack); // credentials not loaded
    else console.log("Successfull login in aws!");
});

const s3 = new AWS.S3();

function uploadFileToS3fromFilePath(filePath, fileName, fileDir) {
    const fileContent = fs.readFileSync(filePath);
    console.log("fileContentLength:" + fileContent.length );
    const params = {
        Bucket: AWS_BUCKET,
        Key: `${fileDir}/${fileName}`,
        Body: fileContent,
    }

    return s3.upload(params).promise();
}

function uploadFileToS3(file, fileName, fileDir) {
    const fileContent = fs.readFileSync(file.path);

    const params = {
        Bucket: AWS_BUCKET,
        Key: `${fileDir}/${fileName}`,
        Body: fileContent,
    }

    return s3.upload(params).promise();
}

module.exports = {
    uploadFileToS3,
    uploadFileToS3fromFilePath
}