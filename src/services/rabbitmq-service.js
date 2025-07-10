const amqp = require('amqplib');
const recordingService = require('../logic/recording-service');
const exchange = 'notetakerCommands';

async function connectAndConsume() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        const channel = await connection.createChannel();

        await channel.assertExchange(exchange, 'fanout', {durable: true});
        const q = await channel.assertQueue('', {exclusive: true});

        await channel.bindQueue(q.queue, exchange, '');

        channel.consume(q.queue, function (msg) {
            if (msg.content) {
                let content = msg.content.toString();
                let object = JSON.parse(content);
                console.log('message received: ' + content);
                if (object.command === 'remove-notetaker') {
                    recordingService.removeNotetaker(object.payload);
                }
            }
        }, {
            noAck: true
        });
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    connectAndConsume
}