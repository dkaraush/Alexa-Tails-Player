'use strict';

const fs = require("fs");
const https = require('https');


const youtubeAPIUrl = "https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&channelId={CHANNEL_ID}&maxResults=50&order={ORDER}&key={API_KEY}"
const youtubeAPIPlaylistsList = "https://www.googleapis.com/youtube/v3/playlists?part=id%2Csnippet&maxResults=50&channelId={CHANNEL_ID}&key={API_KEY}"
const youtubeAPIPlaylistList = "https://www.googleapis.com/youtube/v3/playlistItems?part=id%2Csnippet&maxResults=50&playlistId={PLAYLIST_ID}&key={API_KEY}";
const { spawn } = require("child_process");

var audioFormat = 140; // m4a audio only
var videoFormat = 22; // mp4 1280x720 hd

const pretranslated = {
	"Казки про Чебиряйчиків українською мовою": "Tales about rabbits in Ukrainian language",
	"Стихи Агнии Барто слушать онлайн": "Agnia Barto's poems listen online",
	"Слушать аудиосказки Носова Н. Н. для детей": "Listen audiobooks Nosova for kids",
	"Слушать онлайн сказку Пушкина о царе Салтане": "Listen online Pushkin's tale about Saltan tsar",
	"Чарівні історії про Фей (казки українською мовою)": "Charming stories about fairies (tales in Ukrainian language)",
	"Слушать онлайн сказки Пушкина А. С.": "Listen online Pushkin's tales",
	"��лушать аудиосказки Дисней": "Listen audiobooks Disney",
	"Слухати українські казки": "Listen Ukrainian tales",
	"Аудиосказки Чуковского": "Chukovsky's audiotales"
}


var playerData = exports.playerData = loadJSONFile("player-data.json", {}, false);

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
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIUrl, {
					api_key: config.youtube_api_key, 
					channel_id: config.youtube_channel,
					order: "date"
				}))
				.then(body => {
					if (!body.items) {
						resolve(res.speak("Something went wrong. Try again later").getResponse());
						console.log("error response", body);
					} else if (body.items.length == 0) {
						resolve(res.speak("Channel is empty.").getResponse());
					} else {
						var item = body.items.random();

						var videoId = item.id.videoId;
						var title = item.snippet.title;

						getLink(videoId, hasDisplay).then(url => {
							if (url == null) {
								resolve(res.speak("Video wasn't found. Try again later").getResponse());
								return;
							}

							var data = playerData[user.userId] = {};
							data.query = "random";
							data.current = url;
							data.offset = 0;
							data.title = title;
							data.currentVideoId = videoId;
							playerData[user.userId] = data;

							if (!handlerInput.__latestCount)
								res = res.speak("Playing " + playerData[user.userId].query.replace(/([a-z])([A-Z])/g,"$1 $2") + " tale");
							if (hasVideoApp)
								resolve(res.addVideoAppLaunchDirective(url, title).getResponse());
							else
								resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", url, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse())
						})
					}
				});
		});
	}
},
{
	name: "PlayLatestTaleIntent",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIUrl, {
					api_key: config.youtube_api_key, 
					channel_id: config.youtube_channel,
					order: "date"
				}))
				.then(body => {
					if (!body.items) {
						resolve(res.speak("Something went wrong. Try again later").getResponse());
					} else if (body.items.length == 0) {
						resolve(res.speak("Channel is empty.").getResponse());
						console.log("error response", body);
					} else {
						if ((handlerInput.__latestCount || 0) >= body.items.length) {
							resolve(res.speak("Playlist ended.").getResponse());
							return;
						}
						var item = body.items[handlerInput.__latestCount || 0];

						var videoId = item.id.videoId;
						var title = item.snippet.title;

						getLink(videoId, hasDisplay).then(url => {
							if (url == null) {
								resolve(res.speak("Video wasn't found. Try again later").getResponse());
								return;
							}

							var data = playerData[user.userId] = {};
							data.query = "latest";
							data.queryValue = handlerInput.__latestCount || 0;
							data.current = url;
							data.offset = 0;
							data.title = title;
							data.currentVideoId = videoId;
							playerData[user.userId] = data;

							if (!handlerInput.__latestCount)
								res = res.speak("Playing " + playerData[user.userId].query.replace(/([a-z])([A-Z])/g,"$1 $2") + " tale");
							if (hasVideoApp)
								resolve(res.addVideoAppLaunchDirective(url, title).getResponse());
							else
								resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", url, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse())
						})
					}
				});
		});
	}
},
{
	name: "PlayMostViewedTaleIntent",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIUrl, {
					api_key: config.youtube_api_key, 
					channel_id: config.youtube_channel,
					order: "viewCount"
			}))
			.then(body => {
				if (!body.items) {
					resolve(res.speak("Something went wrong. Try again later").getResponse());
					console.log("error response", body);
				} else if (body.items.length == 0) {
					resolve(res.speak("Channel is empty.").getResponse());
				} else {
					if ((handlerInput.__latestCount || 0) > body.items.length) {
						resolve(res.speak("Playlist ended.").getResponse());
						return;
					}
					var item = body.items[handlerInput.__latestCount || 0];

					var videoId = item.id.videoId;
					var title = item.snippet.title;

					getLink(videoId, hasDisplay).then(url => {
						if (url == null) {
							resolve(res.speak("Video wasn't found. Try again later").getResponse());
							return;
						}

						var data = playerData[user.userId] = {};
						data.query = "mostViewed";
						data.queryValue = handlerInput.__latestCount || 0;
						data.current = url;
						data.offset = 0;
						data.title = title;
						data.currentVideoId = videoId;
						playerData[user.userId] = data;

						if (!handlerInput.__latestCount)
							res = res.speak("Playing " + playerData[user.userId].query.replace(/([a-z])([A-Z])/g,"$1 $2") + " tale");

						if (hasVideoApp)
							resolve(res.addVideoAppLaunchDirective(url, title).getResponse());
						else
							resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", url, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse())
					})
				}
			});
		});
	}
},
{
	name: "PlayMostLikedTaleIntent",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIUrl, {
					api_key: config.youtube_api_key, 
					channel_id: config.youtube_channel,
					order: "rating"
				}))
				.then(body => {
					if (!body.items) {
						resolve(res.speak("Something went wrong. Try again later").getResponse());
					} else if (body.items.length == 0) {
						resolve(res.speak("Channel is empty.").getResponse());
					} else {
						if ((handlerInput.__latestCount || 0) > body.items.length) {
							resolve(res.speak("Playlist ended.").getResponse());
							return;
						}
						var item = body.items	[handlerInput.__latestCount || 0];

						var videoId = item.id.videoId;
						var title = item.snippet.title;

						getLink(videoId, hasDisplay).then(url => {
							if (url == null) {
								resolve(res.speak("Video wasn't found. Try again later").getResponse());
								return;
							}

							var data = playerData[user.userId] = {};
							data.query = "mostLiked";
							data.queryValue = handlerInput.__latestCount || 0;
							data.current = url;
							data.offset = 0;
							data.title = title;
							data.currentVideoId = videoId;
							playerData[user.userId] = data;

							if (!handlerInput.__latestCount)
								res = res.speak("Playing " + playerData[user.userId].query.replace(/([a-z])([A-Z])/g,"$1 $2") + " tale");
							if (hasVideoApp)
								resolve(res.addVideoAppLaunchDirective(url, title).getResponse());
							else
								resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", url, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse())
						})
					}
				});
		});
	}
},
{
	name: "ListPlaylistsIntent",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIPlaylistsList, {
				api_key: config.youtube_api_key,
				channel_id: config.youtube_channel
			}))
			.then(body => {
				if (!body.items) {
					resolve(res.speak("Something went wrong. Try again later.").getResponse());
					console.log("error response", body);
				} else {
					var playlistsTitles = Array.from(body.items, i => i.snippet.title);
					var speech = "";
					speech += "There are " + playlistsTitles.length + " playlists.\n\n";

					for (var i = 0; i < playlistsTitles.length; ++i ) {
						speech += (i+1) + ord((i+1)%10) + ". " + pretranslated[playlistsTitles[i]] + ".\n";
					}

					speech += "\n\nWhich one do you want to hear?";

					playerData[user.userId] = {};
					playerData[user.userId].query = "playlistList";
					playerData[user.userId].data = body.items;

					if (hasDisplay)
						res = res.addRenderTemplateDirective(makeList(playlistsTitles));
					resolve(res.speak(speech).withSimpleCard("Tales playlists", speech).reprompt().getResponse());
				}
			})
		})
	}
},
{
	name: "PlayPlaylistIntent",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		var number = parseInt(handlerInput.__playlistIndex || slotValue(slots.number));
		var plId = null;
		if (!playerData[user.userId] || !playerData[user.userId].data ||
			!(playerData[user.userId].query == "playlistList" || playerData[user.userId].query == "playlist")) {
			return new Promise((resolve, reject) => {
				exports.requestHandlers.filter(h=>h.name=="ListPlaylistsIntent")[0].handle(handlerInput)
					.then(resolve);
			});
		} else {
			var data = playerData[user.userId].data;
			if (number < 1 || number > data.length) {
				return res.speak("Number of playlist must be in range of playlists count. Try again").reprompt().getResponse();
			}
			plId = data[number-1].id;
		}
		return new Promise((resolve, reject) => {
			httpsRequest(replaceParameters(youtubeAPIPlaylistList, {
				api_key: config.youtube_api_key,
				playlist_id: plId
			}))
			.then(body => {
				if (!body.items) {
					resolve(res.speak("Something went wrong. Try again later.").getResponse());
					console.log("error response", body);
				} else {
					if ((handlerInput.__latestCount || 0) >= body.items.length) {
						resolve(res.speak("Playlist ended.").getResponse());
						return;
					}

					var i = handlerInput.__latestCount || 0;
					var title = body.items[i].snippet.title;
					playerData[user.userId].query = "playlist";
					playerData[user.userId].queryValue = number;
					playerData[user.userId].queryNumber = i;
					playerData[user.userId].title = title;
					playerData[user.userId].currentVideoId = body.items[i].snippet.resourceId.videoId;

					getLink(body.items[i].snippet.resourceId.videoId, hasDisplay)
						.then(url => {
							if (url == null) {
								resolve(res.speak("Video wasn't found. Try again later").getResponse());
								return;
							}
							playerData[user.userId].current = url;
							playerData[user.userId].offset = 0;

							if (!handlerInput.__latestCount)
								res = res.speak("Playing tales from " + number + ord(number) + " playlist");
							if (hasVideoApp)
								resolve(res.addVideoAppLaunchDirective(url, title).getResponse());
							else
								resolve(res.addAudioPlayerPlayDirective("REPLACE_ALL", url, randomString(16), 0, null, {title: title, subtitle: "Tale Player"}).getResponse())
						})
				}
			})
		})
	}
},
{
	name: "AMAZON.FallbackIntent", 
	_handle(handlerInput, user, slots, res) {
		return res.speak("Sorry, say again.").reprompt().getResponse();
	}
},
{
	name: "AMAZON.CancelIntent",
	_handle(handlerInput, user, slots, res) {
		return res.speak("Cancelled.").getResponse();
	}
},
{
	name: "AMAZON.StopIntent",
	_handle(handlerInput, user, slots, res) {
		return res.addAudioPlayerStopDirective().getResponse();
	}
},
{
	name: "AMAZON.PauseIntent",
	_handle(handlerInput, user, slots, res) {
		var data = playerData[user.userId] || {};
		data.offset = handlerInput.requestEnvelope.context.AudioPlayer.offsetInMilliseconds;
		playerData[user.userId] = data;
		return res.addAudioPlayerStopDirective().getResponse();
	}
},
{
	name: "AudioPlayer.PlaybackStopped",
	_handle(handlerInput, user, slots, res) {
		var data = playerData[user.userId] || {};
		data.offset = handlerInput.requestEnvelope.context.AudioPlayer.offsetInMilliseconds;
		playerData[user.userId] = data;
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
	name: "AudioPlayer.PlaybackFinished",
	_handle(handlerInput, user, slots, res) {
		return res.getResponse();
	}
},
{
	name: "AMAZON.ResumeIntent",
	alternatives: "AudioPlayer.PlayCommandIssued",
	_handle(handlerInput, user, slots, res, hasDisplay, hasVideoApp) {
		var data = playerData[user.userId];
		if (!data || hasDisplay)
			return res.getResponse();

		return res.addAudioPlayerPlayDirective("REPLACE_ALL", data.current, randomString(16), data.offset || 0, null, {title: data.title, subtitle: "Tale Player"}).getResponse();
	}
},
{
	name: "AMAZON.NextIntent",
	alternatives: "AudioPlayer.NextCommandIssued",
	_handle(handlerInput, user, slots, res) {
		var data = playerData[user.userId];
		if (!data)
			return res.getResponse();

		if (data.query == "random") {
			return new Promise((resolve, reject) => {
				exports.requestHandlers.filter(h => h.name == "PlayRandomTaleIntent")[0].handle(handlerInput)
					.then(resolve);
			})
		} else if (data.query == "latest") {
			return new Promise((resolve, reject) => {
				handlerInput.__latestCount = data.queryValue+1;
				exports.requestHandlers.filter(h => h.name == "PlayLatestTaleIntent")[0].handle(handlerInput)
					.then(resolve);
			})
		} else if (data.query == "mostViewed") {
			return new Promise((resolve, reject) => {
				handlerInput.__latestCount = data.queryValue+1;
				exports.requestHandlers.filter(h => h.name == "PlayMostViewedTaleIntent")[0].handle(handlerInput)
					.then(resolve);
			})
		} else if (data.query == "mostLiked") {
			return new Promise((resolve, reject) => {
				handlerInput.__latestCount = data.queryValue+1;
				exports.requestHandlers.filter(h => h.name == "PlayMostLikedTaleIntent")[0].handle(handlerInput)
					.then(resolve);
			})
		} else if (data.query == "playlist") {
			return new Promise((resolve, reject) => {
				handlerInput.__playlistIndex = data.queryValue;
				handlerInput.__latestCount = data.queryNumber+1;
				exports.requestHandlers.filter(h => h.name == "PlayPlaylistIntent")[0].handle(handlerInput)
					.then(resolve);
			})
		}

		return res.getResponse();
	}
},
{
	name: "AMAZON.PreviousIntent",
	alternatives: "AudioPlayer.NextCommandIssued",
	_handle(handlerInput, user, slots, res) {
		return res.getResponse();
	}
},
{
	name: "LikeVideoIntent",
	_handle(handlerInput, user, slots, res) {
		if (!user.accessToken)
			return linkAccount(res);

		if (!playerData[user.userId] || !playerData[user.userId].currentVideoId)
			return res.speak("There are no tales playing right now").getResponse();
		return new Promise(resolve => {
			youtubeRequest("POST", "/youtube/v3/videos/rate", replaceParameters("id={VIDEOID}&rating=like&key={KEY}", {
				accessToken: user.accessToken, 
				videoId: playerData[user.userId].currentVideoId,
				key: config.youtube_api_key
			}), user.accessToken)
				.then((data, code) => {
					if (data.length > 0) {
						console.log('LikeVideoIntent error');
						console.dir(data);
						resolve(res.speak("Something went wrong. Try again later.").getResponse());
					} else
						resolve(res.speak("Liked.").getResponse());
				})
		})
	}
},
{
	name: "AddToPlaylistIntent",
	_handle: async function(handlerInput, user, slots, res) {
		if (!user.accessToken)
			return linkAccount(res);
		if (!playerData[user.userId] || !playerData[user.userId].currentVideoId)
			return res.speak("There are no tales playing right now").getResponse();

		const playlistName = "Tales Playlist";

		// request own playlists
		var ownPlaylistsRes = await youtubeRequest("GET", "/youtube/v3/playlists", 
								replaceParameters("maxResults=50&mine=true&part=snippet%2CcontentDetails&key={KEY}", {key: config.youtube_api_key}),
								user.accessToken);
		if (ownPlaylistsRes.kind != "youtube#playlistListResponse" || !ownPlaylistsRes.items) {
			console.log("Tried to get own playlists: failed");
			console.log("Response:")
			console.log(JSON.stringify(ownPlaylistsRes,null,'\t'))
			return res.speak("Something went wrong. Try again later.").getResponse();
		}

		var playlists = Array.from(ownPlaylistsRes.items, i => {return {title: i.snippet.title, id: i.id}});
		var playlistsNames = Array.from(playlists, p => p.title);
		var newPlaylist = false;
		var playlistId;
		if (playlistsNames.indexOf(playlistName) == -1) { 
			newPlaylist = true;

			// there is no playlist => create new
			var newPlaylistRes = await youtubeRequest("POST", "/youtube/v3/playlists",
									replaceParameters("part=snippet%2Cstatus&alt=json&key={KEY}", {key: config.youtube_api_key}),
									user.accessToken, {snippet: {title: playlistName}});
			if (newPlaylistRes.kind != "youtube#playlist" || !newPlaylistRes.id) {
				console.log("Tried to create new playlist => failed");
				console.log('Response: ');
				console.log(JSON.stringify(newPlaylistRes,null,'\t'));
				return res.speak("Something went wrong. Try again later.").getResponse();
			}
			playlistId = newPlaylistRes.id;
		} else {
			playlistId = playlists.filter(p => p.title == playlistName)[0].id;
		}

		// save playlist id
		playerData[user.userId].ownPlaylistId = playlistId;

		// add video to playlist
		var videoId = playerData[user.userId].currentVideoId;
		var addVideoRes = await youtubeRequest("POST", "/youtube/v3/playlistItems", replaceParameters("part=snippet&alt=json&key={KEY}", {key: config.youtube_api_key}),
										 user.accessToken, {snippet: {playlistId: playlistId, resourceId: {kind: "youtube#video", videoId: videoId}}});
		if (addVideoRes.kind != "youtube#playlistItem") {
			console.log("Tried to add video to playlist => failed");
			console.log("Response: ");
			console.log(JSON.stringify(addVideoRes,null,'\t'));
			return res.speak("Something went wrong. Try again later.").getResponse();
		}
		return res.speak(`Added to ${newPlaylist?`new playlist with title \"${playlistName}\"`:"existing playlist."}`).getResponse();
	}
},
{
	name: "SubscribeIntent",
	_handle(handlerInput, user, slots, res) {
		if (!user.accessToken)
			return linkAccount(res);
		
		var reqObj = {"snippet":{"resourceId":{"kind":"youtube#channel","channelId":config.youtube_channel}}};
		return new Promise((resolve, reject) => {
			youtubeRequest("POST", "/youtube/v3/subscriptions", replaceParameters("part=snippet&alt=json&key={KEY}", {
					key: config.youtube_api_key
				}), user.accessToken, reqObj)
				.then((data) => {
					if (data.kind !== "youtube#subscription") {
						resolve(res.speak("Something went wrong. Try again later.").getResponse());
						return;
					}
					resolve(res.speak("Subscribed successfully.").getResponse());
				});
		})
	}
},

/* === Comment === */
{
	name: "LeaveCommentIntent",
	_handle(handlerInput, user, slots, res) {
		if (!user.accessToken)
			return linkAccount(res);
		if (!playerData[user.userId] || !playerData[user.userId].currentVideoId)
			return res.speak("There are no tales playing right now").getResponse();

		return res.speak("What should your comment be?").reprompt().getResponse();
	}
},
{
	name: "CommentValueIntent",
	_handle(handlerInput, user, slots, res) {
		var attr = handlerInput.attributesManager.getSessionAttributes();
		if (!attr.lastRequest || !(attr.lastRequest == "LeaveCommentIntent" || attr.lastRequest == "CommentRepeatIntent")) {
			return res.speak("Sorry, say again.").reprompt().getResponse();	 // FallbackIntent
		}

		var commentString = catchAllToString(slots);
		handlerInput.attributesManager.setSessionAttributes({lastRequest: "CommentValueIntent", commentString});
		return res.speak("\""+commentString+"\". Do you want to post this comment?").reprompt("Do you want to post this comment?").getResponse();
	}
},
{
	name: "CommentAcceptIntent",
	_handle: async function(handlerInput, user, slots, res) {
		var attr = handlerInput.attributesManager.getSessionAttributes();
		if (!attr.lastRequest || attr.lastRequest !== "CommentValueIntent" || !attr.commentString)
			return res.speak("Sorry, say again.").reprompt().getResponse();	 // FallbackIntent
		if (!playerData[user.userId] || !playerData[user.userId].currentVideoId)
			return res.speak("There are no tales playing right now").getResponse();

		var commentString = attr.commentString;

		var response = await youtubeRequest("POST", "/youtube/v3/commentThreads", "part=snippet&alt=json&key="+config.youtube_api_key,
											user.accessToken, {snippet:{topLevelComment:{snippet:{textOriginal:commentString}},videoId: playerData[user.userId].currentVideoId}});
		if (!response.kind) {
			console.log("Tried to leave comment => failed");
			console.log("Response:");
			console.dir(response);
			return res.speak("Something went wrong. Try again later.").getResponse();
		}
		return res.speak("Commented.").getResponse();
	}
},
{
	name: "CommentRefuseIntent",
	_handle(handlerInput, user, slots, res) {
		return res.speak("Ok.").getResponse();
	}
},
{
	name: "CommentRepeatIntent",
	_handle(handlerInput, user, slots, res) {
		var attr = handlerInput.attributesManager.getSessionAttributes();
		if (!attr.lastRequest || attr.lastRequest !== "CommentValueIntent")
			return res.speak("Sorry, say again.").reprompt().getResponse(); // FallbackIntent
		if (!playerData[user.userId] || !playerData[user.userId].currentVideoId)
			return res.speak("There are no tales playing right now").getResponse();

		return res.speak("Okay, I'm listening again.").reprompt().getResponse();
	}
}
];

function catchAllToString(slots) {
	var words = [];
	for (var i = 0; i < 100; ++i) {
		var strSlot = i.toString().replace(/\d/g, n => "ABCDEFGHIJ"[n]);
		if (slots[strSlot].value)
			words.push(slots[strSlot].value);
		else break;
	}
	var string = words.join(" ");
	string = string.replace(/^(\w)/g, s => s.toUpperCase());
	string = string.replace(/(\.[ ]{0,}|\?[ ]{0,})(\w)/g, (f, s, d) => s+d.toUpperCase());
	string = string.replace(/nt(\W|$)/g, "n't$1");
	return string;
}

function linkAccount(res) {
	return res.speak("You should link your Youtube Account first. Check your mobile phone.").withLinkAccountCard().getResponse();
}

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
function youtubeRequest(method, path, query, token, data) {
	return new Promise((resolve, reject) => {
		var req = https.request({
			method: method,
			hostname: "content.googleapis.com",
			path: path + "?" + query,
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			}
		}, (res) => {
			var c = [];
			res.on('data', d => c.push(d));
			res.on('end', function () {
				var body = c.join("");
				try {
					body = JSON.parse(body);
				} catch (e) {}
				resolve(body, req.statusCode);
			})
		});
		if (typeof data === "object")
			data = JSON.stringify(data);
		if (typeof data === "string" ||
			data instanceof Buffer)
			req.write(data);
		req.end();
	})
}

function getLink(id, isVideo) {
	return new Promise((resolve, reject) => {
		var linkFound = false;
		var youtubedl = spawn("youtube-dl.exe", ["--format="+(isVideo?videoFormat:audioFormat), "https://www.youtube.com/watch?v="+id, "--get-url"]);
		youtubedl.stdout.on('data', function (data) {
			data = data.toString();
			if (data.substring(0, "https://".length) == "https://") {
				linkFound = true;
				resolve(data);
			} else 
				console.log(data.toString());
		});
		youtubedl.stderr.on('data', d => console.log(d.toString()));
		youtubedl.on('close', function () {
			if (!linkFound)
				resolve(null);
		});
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
		var hasVideoApp = Object.keys(handlerInput.requestEnvelope.context.System.device.supportedInterfaces).indexOf("VideoApp")>=0;
		var hasDisplay = Object.keys(handlerInput.requestEnvelope.context.System.device.supportedInterfaces).indexOf("Display")>=0;
		var user = handlerInput.requestEnvelope.context.System.user;
		var slots = handlerInput.requestEnvelope.request.intent ? handlerInput.requestEnvelope.request.intent.slots : null;
		var res = handler._handle(handlerInput, user, slots, handlerInput.responseBuilder, hasDisplay, hasVideoApp);
		if (res instanceof Promise) {
			return new Promise((resolve, reject) => {
				res.then(response => {
					resolve(response);
					if (handler.name !== "AMAZON.FallbackIntent" && handlerInput.requestEnvelope.session) {
						var attr = handlerInput.attributesManager.getSessionAttributes();
						attr.lastRequest = handler.name;
						handlerInput.attributesManager.setSessionAttributes(attr);
					}
				});
			})
		} else {
			if (handler.name !== "AMAZON.FallbackIntent" && handlerInput.requestEnvelope.session) {
				var attr = handlerInput.attributesManager.getSessionAttributes();
				attr.lastRequest = handler.name;
				handlerInput.attributesManager.setSessionAttributes(attr);
			}
			return res;
		}
	}
});

function slotValue(slot) {
	if (slot.resolutions) {
		if (slot.resolutions.resolutionsPerAuthority) {
			for (var i = 0; i < slot.resolutions.resolutionsPerAuthority.length; ++i) {
				var auth = slot.resolutions.resolutionsPerAuthority[i];
				if (auth.status && auth.status.code == "ER_SUCCESS_MATCH") {
					if (auth.values[0] && auth.values[0].value) {
						return auth.values[0].value.name;
					}
				}
			}
		}
	}
	return slot.value;
}

function makeList(playlists) {
	var r = 
	{
		type: 'ListTemplate1',
		token: 'Files',	
		title: "Dropbox files",
		listItems: Array.from(playlists, (playlist, i) => {
		return {
			token: "item_"+(i+1),
			textContent: {
				primaryText: {
					text: "<font size='6'>"+playlist+"</font>",
					type: "RichText"
				},
				secondaryText: {
					text: "Playlist",
					type: "PlainText"
				}
			}
		}})
	};
	return r;
}

function ord(n) {
	switch (n) {
		case 0: return "th";
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		case 4: return "th";
		default: return "th";
	}
}