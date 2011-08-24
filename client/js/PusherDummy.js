com.pusher.define("com.pusher.test.framework", function(export) {
  
  /**
   * Dummy Pusher object.
   */
  var Pusher = function(appKey, options) {
    Pusher.instances.push(this);
  
    this._channels = {};
  };

  /**
   * Gets the channel with the given channel name.
   * @param {String} The name identifying the channel to be retrieved.
   *
   * @return {dummy.Channel} a dummy channel object.
   */ 
  Pusher.prototype.channel = function(channelName) {
    return this._channels[channelName];
  };

  /**
   * Provides access to all Pusher instances.
   * @type Array
   */
  Pusher.instances = [];

  /**
   * Accesses the first DummyPusher instance and dispatches an event on a channel.
   *
   * @param {String} channelName The name of the channel the event should be triggered on.
   * @param {String} eventName the name of the even to be triggered on the channel
   * @param {String} eventData the data to be sent with the event.
   */
  Pusher.dispatch = function(channelName, eventName, eventData) {
    var instance = Pusher.instances[0];
    var channel = instance.channel(channelName);
    channel.dispatch(eventName, eventData);
  }

  /**
   * Subscribe to a channel.
   * @return {dummy.Channel} A dummy channel object.
   */
  Pusher.prototype.subscribe = function(channelName) {
    var channel = new Channel(channelName);
    this._channels[channelName] = channel;
    return channel;
  };

  /**
   * Not implemented.
   */
  Pusher.prototype.unsubscribe = function(channelName) {
    throw "not implemented";
  }
  Pusher = Pusher;

  /**
   * A dummy channel object.
   * @extends EventsDispatcher
   */
  var Channel = function(name) {
    com.pusher.EventsDispatcher.call(this);
  
    this.name = name;
  };
  com.pusher.extend(Channel, com.pusher.EventsDispatcher);

  /**
   * Dummy object of the event object passed to the
   * pusher:subscription-succeeded event callback.
   * Represents a collection of members subscribed to a presence channel.
   */
  var Members = function() {
    this._members = {};
  
    /**
     * The number of members in the collection.
     *
     * @type Number
     */
    this.count = 0;
  };

  /**
   * Provides a way of adding members to the members collection.
   *
   * @param {Object} Object should have an 'id' and 'info' property as follows:
   *    {
   *      "id": "Unique_user_id",
   *      "info": {
   *        "any" : "thing" // any number of properties on this object
   *      }
   *    }
   *
   * @return The member object parameter that was passed in
   */
  Members.prototype.add = function(member) {
    this._members[member.id] = member;
    ++this.count;
    return member;
  };

  /**
   * Used to loop through the members within the collection.
   * @param {Function} callback A callback to be executed for each member found within
   *  the collection.
   */
  Members.prototype.each = function(callback) {
    for(var id in this._members) {
      callback(this._members[id]);
    }
  };
  
  export.Pusher = Pusher;
  export.Members = Members;
});

if(typeof Pusher !== "undefined" && ALLOW_PUSHER_DUMMY_OVERRIDE !== true) {
  throw "Attempt to override Pusher object but it already exists. To allow Pusher object override set ALLOW_PUSHER_DUMMY_OVERRIDE to 'true'";
}
Pusher = com.pusher.test.framework.Pusher;