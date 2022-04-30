const ws  = require('ws');

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8085;
}

const wss = new ws.WebSocketServer({ port });

class Game {
    constructor() {
        this.players = [];
    }
    start() {
        this.timeStarted = Date.now();
        this.players.forEach((p) => {
            p.send(JSON.stringify(this.getState()))
        })
    }
    getCurrentTick() {
        return Math.min(6000, Math.floor((Date.now() - this.timeStarted) / 100));
    }
    getState() {
        return {type: 'state', currentTick: this.getCurrentTick()}
    }
    onMessage(data, ws) {
        data = JSON.parse(data);
        console.log('received: %s', data);
        wss.clients.forEach(function each(client) {
            client.send(JSON.stringify({type: 'spawn', t: data.t, x: data.x, y: data.y, team: ws === client ? 1 : 0}))
        });
    }
}

const games  = [];

wss.on('connection', function connection(ws) {

    ws.on('message', function message(data) {

        for (const game of games) {
            if (game.players.includes(ws)) {
                game.onMessage(data, ws);
                break;
            }
        }


    });

    while(true) {
        for (const game of games) {
            if (game.players.length < 2) {
                game.players.push(ws)
                if (game.players.length > 1) game.start();
                return;
            }
        }
        games.push(new Game())
    }
});
