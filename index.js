/**
 * Created by ykha on 9/2/16.
 */

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

var SOCKET_LIST = {};

server.listen(3333, function(req, res) {
    console.log("Server is currently start");
});

var Object = function() {
    var self = {
        x:Math.random() * 450 + 1,
        y:450,
        dx: 0,
        id: 0
    };

    self.update = function() {
        self.updatePosition();
    };

    self.updatePosition = function() {

        self.x += self.dx;
        if (self.x < 0) {
            self.x = 5;
        } else if (self.x > 500) {
            self.x = 495;
        }
    };

    self.getDistance = function(other) {
        return Math.sqrt(Math.pow(self.x - other.x, 2) +
                            Math.pow(self.y - other.y, 2));
    };

    return self;
};

var Player = function(id) {
    var self = Object();
    self.id = id;
    self.color = "red";
    self.right = false;
    self.left = false;
    self.attack = false;
    self.speed = 10;

    self.updateSpeed = function() {
        if (self.right) {
            self.dx = self.speed;
        } else if (self.left) {
            self.dx = -self.speed;
        } else {
            self.dx = 0;
        }
    };

    var super_update = self.update;

    self.update = function() {
        self.updateSpeed();
        super_update();
    };

    Player.list[id] = self;
    return self;
};

Player.list = {};
Player.connected = function(socket) {
    var player = Player(socket.id);
    socket.on('keyPressed', function(data) {
        if (data.move == 'left') {
            player.left = data.state;
        } else if (data.move == 'right') {
            player.right = data.state;
        } else if  (data.move == 'attack') {
            player.attack = data.state;
        }
    })
};

Player.disconnected = function(socket) {
    delete Player.list[socket.id];
};

Player.update = function() {
    var dataret = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        dataret.push({
            x: player.x,
            y: player.y,
            color: player.color
        });
    }
    return dataret;
};


var io = require('socket.io')(server,{});
io.sockets.on('connection', function(socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    Player.connected(socket);

    socket.on('disconnect', function() {
        Player.disconnected(socket);
        delete SOCKET_LIST[socket.id];
    });
});

setInterval(function() {
    var all_update = {
        player: Player.update()
    };

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newUpdate', all_update);
    }
}, 33);