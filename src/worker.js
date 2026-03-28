const { parentPort } = require('worker_threads');

if (parentPort) {
    parentPort.on('message', (msg) => {
        // ... resizing logic here ...
        console.log('Worker received:', msg);
    });
}
