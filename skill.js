'use strict';

const https = require('https');

const youtubeAPIUrl = "https://www.googleapis.com/youtube/v3/activities?part=id%2Csnippet%2CcontentDetails&maxResults=50&channelId={CHANNEL_ID}&key={API_KEY}"

const { spawn } = require("child_process");

var audioFormat = 140; // m4a audio only
var videoFormat = 22; // mp4 1280x720 hd

exports.requestHandlers = [
{
	name: "LaunchRequest",
	_handle(handlerInput, user, slots, res) {
		return res.speak("Which tale do you want to hear?")
				 .reprompt()
				 .getResponse();	
	}
},
{
	name: "SessionEndedRequest",
	_handle(handlerInput, user, slots, res) {
		return res.speak("Session ended.").getResponse();
	}
},
{
	name: "PlayRandomTaleIntent",
	_handle(handlerInput, user, slots, res) {
		return new Promise((resolve, reject) => {
			var hasDisplay = Object.keys(handlerInput.requestEnvelope.context.System.device.supportedInterfaces).indexOf("VideoApp")>=0;

			httpsRequest(replaceParameters(youtubeAPIUrl, {api_key: config.youtube_api_key, channel_id: config.youtube_channel}))
				.then(body => {
						console.log(JSON.stringify(body,null,"\t"));
					if (!body.items) {
						resolve(res.speak("Something went wrong. Try again later").getResponse());
					} else if (body.items.length == 0) {
						resolve(res.speak("Channel is empty.").getResponse());
					} else {
						var item = body.items.filter(item => item.snippet.type == "upload").random();

						var link = item.contentDetails.upload.videoId;
						var title = item.snippet.title;

						var linkFound = false;
						var youtubedl = spawn("youtube-dl.exe", ["--format="+(hasDisplay?videoFormat:audioFormat), link, "--get-url"]);
						youtubedl.stdout.on('data', function (data) {
							data = data.toString();
							if (data.substring(0, "https://".length) == "https://") {
								linkFound = true;
								if (hasDisplay)
									resolve(res.addVideoAppLaunchDirective(data, title).getResponse());
								else
									resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", data, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse());
							}
						});
						youtubedl.stderr.on('data', d => console.log(d.toString()));
						youtubedl.on('close', function () {
							if (!linkFound)
								resolve(res.speak("Video link isn't found.").getResponse());
						});
			
					}
				});
		});
	}
},
{
	name: "AMAZON.FallbackIntent", 
	_handle(handlerInput, user, slots, res) {
		return res.speak("Sorry, say again.").reprompt().getResponse();
	}
},
{
	name: "AMAZON.StopIntent",
	_handle(handlerInput, user, slots, res) {
		return res.addAudioPlayerStopDirective().getResponse();
	}
},
{
	name: "AudioPlayer.PlaybackStopped",
	_handle(handlerInput, user, slots, res) {
		return res.getResponse();
	}
},
{
	name: "AudioPlayer.PlaybackStarted",
	_handle(handlerInput, user, slots, res) {
		return res.getResponse();
	}
},
{
	name: "AudioPlayer.PlayCommandIssued",
	_handle(handlerInput, user, slots, res) {
		// TODO
		return res.getResponse();
	}
}

];

function httpsRequest(url) {
	return new Promise((resolve, reject) => {
		https.get(url, function (req) {
			var body = "";
			req.on('data', chunk => body += chunk.toString());
			req.on('end', function () {
				var parsedBody = JSON.parse(body);
				resolve(parsedBody);
			});
			req.on('err', reject);
			req.on('error', reject);
		})
	});
}

exports.errorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.dir(error);

		return handlerInput.responseBuilder
			.speak('Sorry, I can\'t understand the command.')
			.reprompt('Sorry, I can\'t understand the command.')
			.getResponse();
	}
}

exports.requestHandlers.forEach(handler => {
	var allNames = [];
	allNames.push(handler.name);
	if (typeof handler.alternatives === "string")
		allNames.push(handler.alternatives);
	else if (Array.isArray(handler.alternatives))
		allNames = allNames.concat(handler.alternatives);
	handler.conditions = Array.from(allNames, name => {
		var parsedName = name.match(/AudioPlayer\.|PlaybackController\.|[A-Z][a-z.]+|AMAZON\./g);
		if (parsedName == null)
			return;
		if (parsedName[parsedName.length-1] == "Handler")
			parsedName.splice(parsedName.length - 1, 1);

		if (parsedName[parsedName.length-1] == "Request" || parsedName[0] == "AudioPlayer." || parsedName[0] == "PlaybackController.") {
			var requestName = name;
			return (handlerInput) => handlerInput.requestEnvelope.request.type == requestName;
		} else if (parsedName[parsedName.length - 1] == "Intent") {
			return function (handlerInput) {
				return handlerInput.requestEnvelope.request.type == "IntentRequest" &&
						 handlerInput.requestEnvelope.request.intent.name == name;
			};
		} else {
			console.log("Handler doesn't have its request: " + name);
		}
	});
	handler.canHandle = function (handlerInput) {
		for (var i = 0; i < handler.conditions.length; ++i) {
			if (handler.conditions[i](handlerInput))
				return true;
		}
		return false;
	}

	handler.handle = function (handlerInput) {
		var user = handlerInput.requestEnvelope.context.System.user;
		var slots = handlerInput.requestEnvelope.request.intent ? handlerInput.requestEnvelope.request.intent.slots : null;
		return handler._handle(handlerInput, user, slots, handlerInput.responseBuilder)
	}
});
