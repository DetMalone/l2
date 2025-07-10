const sharedMemory = require('./sharedMemory');

class Service {
    static setReadiness(value) {
        sharedMemory.isPodReadyForAction = value;
    }

    static getReadiness() {
        return sharedMemory.isPodReadyForAction;
    }
}

module.exports = Service;