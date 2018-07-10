'use strict';

require("./utils.js");
var fs = require("fs");
var http = require("http");
var Alexa = require("ask-sdk");
var lambda = require("./skill.js");

global.config = loadJSONFile("config.json", {port: 8033, youtube_channel: "<youtube-channel-id>", youtube_api_key: "<api-key>"}, true);

var skill = null;
http.createServer((req, res) => {
	if (req.url == "/alexa/" && req.method == "POST") {
		var body = "";
		req.on('data', chunk => body += chunk);
		req.on('end', function () {
			var parsedBody = JSON.parse(body);
			if (!skill) {
			  skill = Alexa.SkillBuilders.custom()
				.addRequestHandlers(...lambda.requestHandlers)
				.addErrorHandlers(lambda.errorHandler)
				.create();
			}

			skill.invoke(parsedBody)
				.then(function(responseBody) {
					res.end(JSON.stringify(responseBody,"","\t"));
				})
				.catch(function(error) {
					res.statusCode = 500;
					res.end('{error: "error"}');
					console.dir(error);
				});

		});
	}
}).listen(config.port, function (err) {
	if (err) {
		throw err;
	}
	console.log('Listening on :'+config.port);
});

function exitHandler(options, err) {
	if (err) {
		console.dir(err);
	}
	saveJSONFile("config.json", config);
	saveJSONFile("player-data.json", lambda.playerData);
	if (options.exit)
		process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
process.on('unhandledRejection', err => exitHandler({},err));