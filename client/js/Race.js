com.pusher.define("com.pusher.clickrace", function(export) {

  var Race = function(pusherAppKey) {
    com.pusher.EventsDispatcher.call(this);
    
    var self = this;
    Pusher.log = function(msg) {
      self._log(msg);
    }
    
    this.raceStates = {
      waiting: 0,
      running: 1,
      finished: 2
    }
    
    this._uniqueId = null;
    this._question = null;
    this.raceState = this.raceStates.waiting;
    this._runners = {};
    this._winner = null;
    
    this._clickCount = 0;
    this._lastClickVelocity = null;
    this._clicksPerInterval = [0,0,0];
    this.raceDistance = 50;
    this._distanceTravelled = 0;
  
    this._pusher = new Pusher(pusherAppKey);
    this._interestCount = 0;
    
    this._trackingId == null;
    
    this.runnerName = null;
  };
  com.pusher.extend(Race, com.pusher.EventsDispatcher);
  
  Race.prototype.load = function(uniqueId, state) {
    
    this._uniqueId = uniqueId;
    this._question = state.question;
    this.raceState = state.raceState;
    this._runners = state.runners || {};
    this._winner = state.winner;
  
    this._raceChannel = this._pusher.subscribe("presence-clickrace-race-" + this._uniqueId);
  
    var self = this;
    this._raceChannel.bind("pusher:subscription_succeeded", function(members) {
      self._setRaceInterestCount(members.count);
    });
  
    this._raceChannel.bind("pusher:member_added", function(member) {
      self._setRaceInterestCount(self._interestCount+1);
    });
  
    this._raceChannel.bind("pusher:member_removed", function(member) {
      self._setRaceInterestCount(self._interestCount-1);
    });
    
    this._raceChannel.bind("client-click-race-ready", function(ev) {
      self._startRaceCountDown(ev.startIn);
    });
  };
  
  Race.prototype.save = function() {
    return {
      question: this._question,
      raceState: this.raceState,
      runners: this._runners,
      winner: this._winner
    };
  };

  Race.prototype._setRaceInterestCount = function(count) {
    this._interestCount = count;
    this.dispatch('interest-updated', {count: count});
  };
  
  Race.prototype.ready = function() {
    var event = {
      startIn: 3
    };
    this._raceChannel.trigger("client-click-race-ready", event);
    this._startRaceCountDown(event.startIn);
  }
  
  Race.prototype._startRaceCountDown = function(timeToStart) {
    var self = this;
    
    var ev = {
      startsIn: timeToStart
    };
    self.dispatch('race-starts-in', ev);
    
    if(timeToStart === 0) {
      // TODO: organiser has too big an advantage here
      self.start();
    }
    else {
      timeToStart = timeToStart -1;
    
      setTimeout(function() {
        self._startRaceCountDown(timeToStart);
      }, 1000);
    }
  };
  
  Race.prototype.start = function() {
    this.raceState = this.raceStates.running;
  };

  Race.prototype.join = function(runnerName) {
    
    var self = this;
    
    if(this.runnerName !== null || this._runners[runnerName] ) {
      this._log("Cannot add runner " + runnerName + ". Runner already exists.");
      return false;
    }
    this.runnerName = runnerName;
    
    this._runnersChannel = this._pusher.subscribe("presence-clickrace-runners" + this._uniqueId);
    this._runnersChannel.bind("pusher:before_auth", function(authData) {
      authData.runner = runnerName;
    });
    
    this._runnersChannel.bind('pusher:subscription_succeeded', function(members) {
      var allMembers = [];
      members.each(function(member) {
        self._runnerAdded(member)
      });
    });
    
    this._runnersChannel.bind('pusher:member_added', function(member) {
      self._runnerAdded(member)
    });
    
    this._runnersChannel.bind('pusher:member_removed', function(member) {
      self._runnerRemoved(member);
    });
    
    this._runnersChannel.bind('client-click-velocity-updated', function(update) {
      self.dispatch("click-velocity-updated", update);
    });
    
    this._runnersChannel.bind('client-click-race-winner', function(update) {
      self._raceWon(update);
    });
    
    this._startVelocityTracking();
  };
  
  Race.prototype._runnerAdded = function(runner) {
    this._runners[runner.id] = runner.id;
    this.dispatch('runner-added', runner);    
  };
  
  Race.prototype._runnerRemoved = function(runner) {
    this.dispatch('runner-removed', runner);
    delete this._runners[runner.id];
  };
  
  Race.prototype.click = function() {
    ++this._clickCount;
  };
  
  Race.prototype._startVelocityTracking = function() {
    var self = this;
    self._trackingId = setInterval(function() {
      
      self._clicksPerInterval.push(self._clickCount);
      self._clickCount = 0;
      self._clicksPerInterval.shift();
      var count = 0;
      for(var i = 0, l = self._clicksPerInterval.length; i < l; ++i) {
        count += self._clicksPerInterval[i];
      }
      var value = Math.ceil(count/self._clicksPerInterval.length);
      
      if(self.raceState == self.raceStates.running) {
        self._distanceTravelled = (self._distanceTravelled + value);
      }
      
      var event = {
        runner: self.runnerName,
        velocity: value,
        distance: self._distanceTravelled
      };
      self.dispatch("click-velocity-updated", event);
      
      if(value !== self._lastClickVelocity) {
           
        self._lastClickVelocity = value;
        self._runnersChannel.trigger("client-click-velocity-updated", event);
      }
      
      if(self._distanceTravelled >= self.raceDistance) {
        var event = {
          winner: self.runnerName
        };
        self._runnersChannel.trigger("client-click-race-winner", event);
        self._raceWon(event);
      }
    }, 1000)
  };
  
  Race.prototype._stopVelocityTracking = function() {
    clearInterval(this._trackingId);
    this._trackingId = null;
  };
  
  Race.prototype._raceWon = function(update) {
    this.raceState = this.raceStates.finished;
    this._stopVelocityTracking();
    this.dispatch('race-won', update);
  };

  Race.prototype._$getRaceChannel = function() {
    return this._raceChannel;
  };

  Race.prototype._$getClicksChannel = function() {
    return this._runnersChannel;
  };
  
  Race.prototype._log = function(msg) {
    console.log(msg);
  };
  
  export.Race = Race;
});