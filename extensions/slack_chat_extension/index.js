/**
 * Slack chat extension for drupal-node.js.
 */
'use strict';

var SlackClient = require('./lib/slack-client.js');

var slackChatExtension = {};

/**
 * Sets up the Slack client as needed.
 *
 * @param clientManager
 *   Client Manager to store the Slack client on.
 * @param callback
 *   Callback to call when the connection is set up. First argument will receive
 *   an error on failure.
 */
slackChatExtension.ensureRtmConnection = function (clientManager, callback) {
  if (!clientManager.slackClient) {
    clientManager.logger.log("Creating Slack client.");

    // Retrieve access info from Drupal.
    var message = {
      messageType: 'slackChat',
      command: 'getConfig'
    };
    
    clientManager.backend.sendMessageToBackend(message, function (error, response, body) {
      if (error) {
        clientManager.logger.log("ensureRtmConnection: Failed to retrieve Slack chat configuration.");
        clientManager.logger.debug("Error", error);

        callback(error);
        return;
      }
      
      try {
        var data = JSON.parse(body);
      }
      catch (exception) {
        clientManager.logger.log("ensureRtmConnection: Failed to parse response:", exception);
        clientManager.logger.debug("Body", body);
        
        callback(exception);
        return;
      }

      if (!data.access_token || !data.bot_access_token || !data.bot_user_id || !data.channel) {
        clientManager.logger.log("ensureRtmConnection: Slack configuration not available.");
        callback(new Error("Slack configuration not available."));
        return;
      }
      
      clientManager.slackClient = new SlackClient(data.access_token, data.bot_access_token, data.bot_user_id, data.channel, clientManager);
      clientManager.slackClient.connect(callback);
    });

  }
  else {
    callback();
  }
};

/**
 * Route callback for the prepare channel route. Connects to Slack if the
 * connection is not in place yet, and registers a channel token sent in the
 * request.
 */
slackChatExtension.prepareChannelRoute = function (req, res) {
  req.clientManager.logger.debug("Route callback: prepareChannelRoute");

  if (!req.body.channel || !req.body.token || !req.body.slack_channel) {
    res.send({status: 'error', error: 'Required parameters are missing.'});
    return;
  }

  slackChatExtension.ensureRtmConnection(req.clientManager, function (err) {
    if (err) {
      req.clientManager.logger.log("prepareChannelRoute: Unable to connect to Slack.");

      res.send({status: 'error', error: err.message});
      return;
    }

    req.clientManager.slackClient.registerSlackChannel(req.body.slack_channel, req.body.channel);

    req.clientManager.setContentToken(req.body.channel, req.body.token, req.body);
    
    res.send({status: 'success'});
  });
  
};

/**
 * Route callback for the reset route. Should be called when the slack app
 * authentication changes to force the reloading of auth info.
 */
slackChatExtension.resetRoute = function (req, res) {
  req.clientManager.logger.debug("Route callback: resetRoute");

  if (req.clientManager.slackClient) {
    req.clientManager.slackClient.disconnect();
    delete req.clientManager.slackClient;
  }

  res.send({status: 'success'});
};

/**
 * Defines custom routes.
 *
 * Each route should specify the following:
 *   path: The path that the route will handle.
 *   type: 'get' or 'post'.
 *   handler: The callback function to call when this route is requested.
 *   auth: If true, the service key will be validated and the handler will only
 *     be called if the key is valid. This will also prepend the baseAuthPath
 *     to the path. E.g. the path /example might become /nodejs/example.
 */
slackChatExtension.routes = [
  {
    path: '/slack_chat/prepare_channel',
    type: 'post',
    auth: true,
    handler: slackChatExtension.prepareChannelRoute
  },
  {
    path: '/slack_chat/reset',
    type: 'post',
    auth: true,
    handler: slackChatExtension.resetRoute
  }
];

module.exports = slackChatExtension;
