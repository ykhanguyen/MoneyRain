/**
 * Money Rain
 * Created by ykha on 9/2/16.
 */

var express = require('express');
var app = express();
app.disable('x-powered-by');

var server = require('http').Server(app);

app.use(express.static(__dirname + '/public'));
var SOCKET_LIST = {};
app.set('port', process.env.PORT || 2222);



app.get('/', function(req, res) {
    res.sendFile('index.html');
});

server.listen(app.get('port'), function(req, res) {
    console.log("Server is currently start");
});


var Object = function() {
    var self = {
        x:Math.random() * 350 + 10,
        y:450,
        dx: 0,
        dy: 0,
        id: 0
    };

    self.update = function() {
        self.updatePosition();
    };

    self.updatePosition = function() {

        self.x += self.dx;
        self.y += self.dy;
        if (self.x <= 5) {
            self.x = 5;
        } else if (self.x >= 335) {
            self.x = 335;
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
    self.bullet_color = "";
    self.score = 0;
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

        if (self.attack) {
            self.bullet_out();
        }

        self.bullet_out = function() {
            var bullet = Bullet(self.id, self.bullet_color);
            bullet.x = self.x + 5;
            bullet.y = self.y ;
        };

        self.attack = false;
    };

    Player.list[id] = self;
    return self;
};
var bullet_color_arr = ["red", "green", "blue"];
Player.list = {};
Player.connected = function(socket) {
    var player = Player(socket.id);
    socket.on('keyPressed', function(data) {
        if (data.move == 'left') {
            player.left = data.state;
        } else if (data.move == 'right') {
            player.right = data.state;
        } else if  (data.move == 'attack1') {
            player.attack = data.state;
            player.bullet_color = bullet_color_arr[0];
        } else if (data.move == 'attack2') {
            player.attack = data.state;
            player.bullet_color = bullet_color_arr[1];
        } else if (data.move == 'attack3') {
            player.attack = data.state;
            player.bullet_color = bullet_color_arr[2];
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


var Bullet = function(parent_id, color) {
    var self = Object();
    self.id = Math.random();
    self.dy = -10;
    self.parent_id = parent_id;
    self.remove = false;
    self.color = color;

    var super_update = self.update;

    self.update = function() {
        if (self.y < 0 ) {
            self.remove = true;
        }
        
        super_update();

        for (var i in Coin.list) {
            var coin = Coin.list[i];
            if (self.getDistance(coin) <= 20 ) {
                self.remove = true;
                coin.remove = true;
                if (coin.color === self.color) {
                    Player.list[self.parent_id].score++;
                } else {
                    Player.list[self.parent_id].score--;
                }

                console.log(Player.list[self.parent_id].score);
                delete Coin.list[coin.id];
            }
        }
    };
    Bullet.list[self.id] = self;
    return self;
};

Bullet.list = {};

Bullet.update = function() {
    var dataret = [];
    for (var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        if (bullet.remove) {
            delete Bullet.list[i];
        } else {
            dataret.push({
                x: bullet.x,
                y: bullet.y,
                color: bullet.color
            });
        }
    }
    return dataret;
};

var Coin = function(color) {
    var self = Object();
    self.id = Math.random();
    self.dy = 5;
    self.remove = false;
    self.color = color;

    var super_update = self.update;
    self.update = function() {
        if (self.y > 500) {
            self.remove = true;
        }
        super_update();
    };
    Coin.list[self.id] = self;

    return self;
};

Coin.list = {};
Coin.update = function() {
    var dataret = [];
    for (var i in Coin.list) {
        var coin = Coin.list[i];
        coin.update();
        if (coin.remove) {
            delete Bullet.list[i];
        } else {
            dataret.push({
                x: coin.x,
                y: coin.y,
                color: coin.color
            });
        }
    }
    return dataret;
}

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
    if(Math.random() < 0.1) {
        var ran_index = parseInt(Math.random() * 3);
        var coin = Coin(bullet_color_arr[ran_index]);

        coin.x = Math.random() * 340;
        coin.y = -5;
    }

}, 30);

setInterval(function() {
    var all_update = {
        player: Player.update(),
        bullet: Bullet.update(),
        coin: Coin.update()
    };

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newUpdate', all_update);
    }
}, 33);



