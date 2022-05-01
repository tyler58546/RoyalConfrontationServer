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
        return {type: 'state', currentTick: this.getCurrentTick(), usernames: [this.players[0].username, this.players[1].username]}
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

wss.on('connection', function connection(ws, req) {

    const sp = new URL('ws://localhost'+req.url).searchParams;
    if (sp) {
        ws.username = sp.get('username') || 'No username';
    } else {
        ws.username = 'No username';
    }

    console.log(`${ws.username} connected`);


    ws.on('message', function message(data) {
        for (const game of games) {
            if (game.players.includes(ws)) {
                game.onMessage(data, ws);
                break;
            }
        }


    });

    ws.on('close', function close() {
        for (const game of games) {
            const index = games.indexOf(game);
            for (const player of game.players) {
                if (game.players < 2 && player.readyState > 1) {
                    game.players = [];
                    console.log(`Removed player from game ${index}`)
                }
            }
            for (const player of game.players) {
                if (player.readyState < 2) return;
            }
            games.splice(index, 1);
            console.log(`Closing game ${index}`)
        }
    });

    while(true) {
        for (const game of games) {
            if (game.players.length < 2) {
                game.players.push(ws)
                console.log(`${ws.username} joined game ${games.indexOf(game)} (${game.players.length}/2)`);
                if (game.players.length > 1) game.start();
                return;
            }
        }
        games.push(new Game())
    }
});
