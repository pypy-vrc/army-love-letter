const url = require('url');
const http = require('http');
const https = require('https');
const http_agent = new http.Agent({
	keepAlive: true,
	keepAliveMescs: 30000
});
const https_agent = new https.Agent({
	keepAlive: true,
	keepAliveMescs: 30000
});

function parseDate(s) {
	return new Date(+s.substr(0, 4), +s.substr(4, 2) - 1, +s.substr(6, 2), +s.substr(8, 2) || 0, +s.substr(10, 2) || 0, +s.substr(12, 2) || 0, +s.substr(14, 3) || 0);
}

Date.prototype.format = function(fmt) {
	var self = this;
	return fmt.replace(/YYYY|MM|DD|HH24|MI|SS/ig, function(s) {
		switch (s.toUpperCase()) {
		case 'YYYY':	return ('' + (10000 + self.getFullYear())).substr(-4);
		case 'MM':		return ('' + (101 + self.getMonth())).substr(-2);
		case 'DD':		return ('' + (100 + self.getDate())).substr(-2);
		case 'HH24':	return ('' + (100 + self.getHours())).substr(-2);
		case 'MI':		return ('' + (100 + self.getMinutes())).substr(-2);
		case 'SS':		return ('' + (100 + self.getSeconds())).substr(-2);
		}
		return s;
	});
};

function log() {
	console.log.apply(console, [(new Date()).format('MM/DD HH24:MI:SS'), ...arguments]);
}

function request(options) {
	var callback = options.callback;
	var request = false;
	if (options.url) {
		options = Object.assign(options, url.parse(options.url));
	}
	if (options.protocol === 'http:') {
		options.agent = http_agent;
		request = http.request;
	} else if (options.protocol === 'https:') {
		options.agent = https_agent;
		request = https.request;
	}
	var req = request(options, res => {
		var chunks = [];
		res.on('data', (chunk) => {
			chunks.push(chunk);
		}).on('end', () => {
			callback(Buffer.concat(chunks), res);
		}).on('aborted', () => {
			log('request#1', options);
			callback();
		}).on('error', () => {
			log('request#2', options);
			callback();
		});
	}).on('abort', () => {
		log('request#3', options);
		callback();
	}).on('error', () => {
		log('request#4', options);
		callback();
	});
	req.setNoDelay(true);
	if (options.data && options.method === 'POST')
		req.end(options.data);
	else
		req.end();
}

//
// SQLITE3
//

const sqlite3 = require('sqlite3');

//
// EXPRESS
//

const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/letter'));
app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.listen(3001, '127.0.0.1');

//
//
//

const password = '';

app.post('/login', (req, res) => {
	res.json({
		token: (req.body.challenge === password) ? password : ''
	});
});

app.post('/posts', (req, res) => {
	var offset = +req.body.offset || 0;
	var db = new sqlite3.Database('letter.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
		if (err) {
			console.log(err);
		}
		db.run('CREATE TABLE IF NOT EXISTS letter (id INTEGER PRIMARY KEY, at TEXT, ip TEXT, nick TEXT, text TEXT)', err => {
			db.get('SELECT count(*) count FROM letter', (err, row) => {
				if (err) {
					console.log(err);
				}
				if (req.body.token !== password) {
					res.json({
						total: row.count,
						offset: offset,
						rows: []
					});
					return db.close();
				}
				db.all(`SELECT * FROM letter ORDER BY id DESC LIMIT ${offset},10`, (err, rows) => {
					if (err) {
						console.log(err);
					}
					res.json({
						total: row.count,
						offset: offset,
						rows: rows
					});
					db.close();
				});
			});
		});
	});
});

app.post('/post', (req, res) => {
	res.sendStatus(204);
	var db = new sqlite3.Database('letter.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
		if (err) {
			console.log(err);
		}
		db.run('CREATE TABLE IF NOT EXISTS letter (id INTEGER PRIMARY KEY, at TEXT, ip TEXT, nick TEXT, text TEXT)', err => {
			if (err) {
				console.log(err);
			}
			db.run('INSERT INTO letter (at, ip, nick, text) VALUES (datetime(\'now\', \'localtime\'), $ip, $nick, $text)', {
				$ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
				$nick: req.body.nick || '',
				$text: req.body.text || ''
			}, err => {
				if (err) {
					console.log(err);
				}
				db.close();
			});
		});
	});
});