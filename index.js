'use strict';

require("./utils.js");
var fs = require("fs");
var http = require("http");
var Alexa = require("ask-sdk");
var lambda = require("./skill.js");

try {
	global.config = JSON.parse(fs.readFileSync("config.json").toString());
} catch (e) {
	console.dir(e);
	global.config = {port: 8033, youtube_channel: "<youtube-channel>", youtube_api_key: "<api-key>"};
	fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"));
}

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
})