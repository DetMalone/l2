function parseJSONFromEventStr(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return null;
    }
}

module.exports = {
    parseJSONFromEventStr: parseJSONFromEventStr,
}