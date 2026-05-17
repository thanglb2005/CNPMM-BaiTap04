const EventEmitter = require('events');

class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

const messageBus = new MessageBus();
module.exports = messageBus;
