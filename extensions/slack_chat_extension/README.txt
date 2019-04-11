This directory contains an extension for the drupal-node.js server application
(https://github.com/beejeebus/drupal-nodejs) to add functionality needed by the
slack_chat module.

Slack_chat depends on the Node.js integration module
(https://www.drupal.org/project/nodejs), so first you will need to install that
module and the drupal-node.js application, which is required by the Node.js
integration module.

Installing the extension
------------------------

  * Ensure that the Node.js integration module is installed on your Drupal site,
    and the drupal-node.js application is installed on your server.
    For documentation on how to set up Node.js integration see:
    https://www.drupal.org/project/nodejs

  * Copy this directory into the 'extensions' subdirectory of the drupal-node.js
    application (so that the package.json file is located at
    extensions/slack_chat_extension/package.json).

  * Step into the extensions/slack_chat_extension directory, and run
    'npm install' to install the dependencies.

  * Enable the extension in the node.js app's config file (nodejs.config.js) by
    adding the extension's name in the 'extensions' property of the
    configuration, as follows:

    // In nodejs.config.js
    settings = {
      // ...
      extensions: ['slack_chat_extension'],
      // ...
    };

  * Start or restart the drupal-node.js application.

  * Visit your Drupal site's status page to make sure it indicates that the
    connection to the node.js server has been successful. Note that you may see
    an error indicating that Slack chat is not authorized to access your Slack
    account. This is ok at this point. Proceed to configure the Slack chat
    Drupal module.

For more documentation, see slack_chat module's project page. Feel free to file
an issue in the issue queue if you have any feedback or questions.
https://www.drupal.org/project/slack_chat
