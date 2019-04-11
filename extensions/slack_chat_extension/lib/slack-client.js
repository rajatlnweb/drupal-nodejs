/**
 * Slack chat client. Maintains a rtm connection to Slack and responds to events.
 */
'use strict';

var RtmClient = require('@slack/client').RtmClient;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var emoji = require('./emoji');

/**
 * Constructor.
 */
function SlackClient(apiToken, botToken, botUserId, channel, clientManager) {
  var _this = this;

  this.apiToken = apiToken;
  this.botToken = botToken;
  this.botUserId = botUserId;
  this.channel = channel;
  this.clientManager = clientManager;
  this.slackChannels = {};

  this.rtmClient = new RtmClient(this.botToken, {logLevel: 'error'});

  this.rtmClient.on(RTM_EVENTS.MESSAGE, function (message) {
    _this.handleMessage(message);
  });
}

/**
 * Assigns a Slack channel id to a node.js channel.
 *
 * @param slackChannelId
 * @param contentChannel
 */
SlackClient.prototype.registerSlackChannel = function (slackChannelId, contentChannel) {
  this.slackChannels[slackChannelId] = contentChannel;
};

/**
 * Handles a message coming from Slack. Forwards the message as an appropriate
 * message on the socket to the client.
 *
 * @param message
 *   Message object from the Slack api.
 */
SlackClient.prototype.handleMessage = function (message) {
  this.clientManager.logger.debug('Received Slack message', message);

  // Ignore bot messages and messages to unknown channels.
  if (message.type != 'message' || !this.slackChannels[message.channel] || message.bot_id || message.user == 'USLACKBOT') {
    return;
  }

  if (!message.subtype) {
    // Normal user-entered message.
    var user = this.rtmClient.dataStore.getUserById(message.user);
    var username;
    if (user) {
      username = user.real_name || user.name;
    }
    else {
      username = 'Anonymous';
    }

    var nodejsMessage = {
      callback: 'slackChatHandler',
      channel: this.slackChannels[message.channel],
      event: 'message',
      text: this.formatText(message.text),
      user: username
    };

    this.clientManager.publishMessageToContentChannel(this.slackChannels[message.channel], nodejsMessage);
  }
  else if (message.subtype == 'channel_archive') {
    var nodejsMessage = {
      callback: 'slackChatHandler',
      channel: this.slackChannels[message.channel],
      event: 'ended'
    };

    this.clientManager.publishMessageToContentChannel(this.slackChannels[message.channel], nodejsMessage);

    delete this.slackChannels[message.channel];
  }

};

/**
 * Formats a Slack message text. Replaces user and channel references with the
 * corresponding name, and replaces emoji markup with the corresponding HTML-encoded
 * unicode characters.
 *
 * @param text
 *   Message text.
 * @return
 *   Formatted text. May contain HTML, but Slack normally pre-sanitizes HTML
 *   tags.
 */
SlackClient.prototype.formatText = function (text) {
  var _this = this;

  // Replace user and channel references.
  var matches = text.match(/<[^>]+>/g);
  if (matches) {
    matches.forEach(function (match) {
      var type = match.substring(1, 3);

      if (type == '#C') {
        // Format is <#Cxxxxxx>
        var channel = _this.rtmClient.dataStore.getChannelById(match.substring(2, match.length - 1));
        if (channel) {
          text = text.replace(match, '#' + channel.name);
        }
      }
      else if (type == '@U') {
        // Format is <@Uxxxxxx>
        var user = _this.rtmClient.dataStore.getUserById(match.substring(2, match.length - 1));
        if (user) {
          text = text.replace(match, '@' + (user.real_name || user.name));
        }
      }
    });
  }

  // Replace emojis.
  matches = text.match(/:[\w+-]+:/g);
  if (matches) {
    matches.forEach(function (match) {
      // Format is :emoji_name:
      var id = match.substring(1, match.length - 1);
      if (emoji[id]) {
        text = text.replace(match, emoji[id]);
      }
    });
  }

  return text;
};

/**
 * Initiates an rtm connection to Slack.
 *
 * @param callback
 *   Called when the connection is completed. First argument is an error on
 *   failure.
 */
SlackClient.prototype.connect = function (callback) {
  var client = this.rtmClient;

  var successHandler = function () {
    client.removeListener(RTM_CLIENT_EVENTS.UNABLE_TO_RTM_START, failureHandler);
    callback();
  };

  var failureHandler = function () {
    client.removeListener(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, successHandler);
    callback(new Error('Unable to connect to Slack.'));
  };

  client.once(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, successHandler);
  client.once(RTM_CLIENT_EVENTS.UNABLE_TO_RTM_START, failureHandler);

  client.start();
};

/**
 * Closes an rtm connection to Slack.
 */
SlackClient.prototype.disconnect = function () {
  this.rtmClient.disconnect();
};

module.exports = SlackClient;
