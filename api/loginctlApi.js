// jshint esversion: 6

const config = require('../config/config');
const commandWrapper = require('../util/commandWrapper');

function streamToString (stream) {
    const chunks = []
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => {
            console.log(chunk);
            chunks.push(chunk);
        });
        stream.on('error', reject);
        stream.on('end', () => {
            console.log(chunks);
           resolve(Buffer.concat(chunks).toString('utf8'));
        });
    })
  }

module.exports = (router) => {

    router.get('/lock/:id', (req, res) => {
        console.log('GET /lock');
        commandWrapper.command = config.LOCK_COMMAND + ' ' + req.params.id;
        commandWrapper('', { debug: true }, (err, stream) => {
            console.log('err', err);
            // console.log('stream', stream);
            res.status(200).json({ status: 'ok' });
        });
    });
    router.get('/unlock/:id', (req, res) => {
        console.log('GET /unlock');
        commandWrapper.command = config.UNLOCK_COMMAND + ' ' + req.params.id;
        commandWrapper('', { debug: true }, (err, stream) => {
            console.log('err', err);
            // console.log('stream', stream);
            res.status(200).json({ status: 'ok' });
        });

    });
    router.get('/sessions', (req, res) => {
        console.log('GET /sessions');
        commandWrapper.command = config.ACTIVE_SESSIONS;
        commandWrapper('', { debug: true, getStdOut: true }, (err, stream) => {
            console.log('err', err);
            // console.log('stream', stream);
            console.log(commandWrapper.stdout);
            res.status(200).json({ status: 'ok', msg: commandWrapper.stdout });
        });
    });

    return router;
};