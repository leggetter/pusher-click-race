com.pusher.define("com.pusher.clickrace", function(export) {

 if(!document.location.port) {
   // hack - assume we are running from the PHP example in the /clickrace/client
   // directory. Set auth endpoint accordingly
   Pusher.channel_auth_endpoint = "/clickrace/server/php/auth/"
   console.log("setting auth endpoint: " + Pusher.channel_auth_endpoint);
 }

  var clickrace = {};

  clickrace.raceForTypes = {
    "prize": "prize",
    "forfeit": "forfeit"
  };
  clickrace.userTypes = {
    "organiser": "organiser",
    "runner": "runner",
    "audience": "audience"
  };
  clickrace.raceStates = {
    "watching": "watching",
    "waitingForRunners": "waiting-for-runners",
    "getReady": "get-ready",
    "running": "running",
    "finished": "finished"
  };
  clickrace.raceState = null;
  clickrace.raceForChoice = clickrace.raceForTypes.prize;
  clickrace.raceForChoiceEl = $("#question .selection.prize");
  clickrace.uniqueId = null;
  clickrace.race = null;
  
  clickrace.userType = null;
  clickrace.setUserType = function(type) {
    $(document.body).removeClass(clickrace.userType);
    clickrace.userType = type;
    $(document.body).addClass(clickrace.userType);
  };
  clickrace.setUserType(clickrace.userTypes.audience);
  
  clickrace.setRaceState = function(state) {
    $(document.body).removeClass(clickrace.raceState);
    clickrace.raceState = state;
    $(document.body).addClass(clickrace.raceState);
  };
  clickrace.setRaceState(clickrace.raceStates.watching);
  
  clickrace.setUpUniqueId = function() {
    if(!document.location.hash) {
      var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });
      clickrace.uniqueId = guid;
      document.location.hash = guid;
      $("#page_loader").hide();
      $("#question").fadeIn();
      clickrace.setUserType(clickrace.userTypes.organiser);
    }
    else {
      clickrace.uniqueId = document.location.hash.replace("#", "");
      
      clickrace.load(function(raceInfo) {
        $("#page_loader").hide();
        
        if(raceInfo) {
          clickrace.setUpRace(raceInfo);
        }
        else {
          $("#question").fadeIn();
          clickrace.setUserType(clickrace.userTypes.organiser);
        }
      });
    }
  };
  
  clickrace.load = function(callback) {
    Rasta.get("clickrace_" + clickrace.uniqueId,
      function(val) {
        var info = null;
        if(val) {
          val = clickrace.decode(val);
          info = JSON.parse(clickrace.decode(val));
        }
        callback(info);
      },
      function() {
        alert("Something went wrong retrieving the race details from Rasta. Maybe the race doesn't exist?");
      }
    );
  };
  
  clickrace.save = function(callback) {
    var saveInfo = clickrace.race.save();
    var json = JSON.stringify(saveInfo);
    var value = clickrace.encode(json);
    Rasta.set("clickrace_" + clickrace.uniqueId, value,
      callback,
      function() {
        alert("something went wrong storing data in Rasta")
      }
    );
  };
  
  clickrace.addBehaviours = function() {
    $(function() {
      $("#page_loader").fadeOut();
    
      $("#question .selection").click(clickrace.questionSelectionClicked);

      $("#race_for_decision_btn").click(clickrace.questionDecisionBtnClicked);
    });
  };

  clickrace.questionSelectionClicked = function(ev) {
    ev = ev || window.event;
    el = ev.target || el.srcElement;
    el = $(el);
  
    if( clickrace.raceTypeHasChanged(el) ) {
    
      var isPrize = el.hasClass(clickrace.raceForTypes.prize);
      clickrace.raceForChoice = (isPrize?clickrace.raceForTypes.prize:clickrace.raceForTypes.forfeit);
    
      clickrace.raceForChoiceEl.removeClass("selected");        
      clickrace.raceForChoiceEl = el;
      clickrace.raceForChoiceEl.addClass("selected");
    
      var prefix = clickrace.getQuestionPrefix(clickrace.raceForChoice);
      $("#race_for_prefix").text(prefix);
    }
  };

  clickrace.raceTypeHasChanged = function(el) {
    return !el.hasClass(clickrace.raceForChoice);
  };

  clickrace.questionDecisionBtnClicked = function() {
    var racingForText = $.trim( $("#race_for_text").val() );
    if(racingForText.length < 10) {
      alert("Please provide a bit more detail about the " + clickrace.raceForChoice);
    }
    else {
      var questionPrefix = clickrace.getQuestionPrefix(clickrace.raceForChoice);
      var question = questionPrefix + " " + racingForText;
      clickrace.setUpRace({question: question});
    }
  };
  
  clickrace.encode = function(val) {
    return val.replace(/\s/g, "_");
  }
  
  clickrace.decode = function(val) {
    return val.replace(/_/g, " ");
  }
  
  clickrace.setQuestionUI = function(question) {
    $("#chosen_question h3").text(question);
  
    $("#question").slideUp(function() {
      $("#chosen_question").slideDown();        
    });
  };

  clickrace.getQuestionPrefix = function(choice) {
    if(choice === clickrace.raceForTypes.prize) {
      return "The winner will...";
    }
    else {
      return "The loser has to...";
    }
  };

  clickrace.setUpRace = function(raceInfo) {
    
    $("#join_race_btn").click(clickrace.joinRaceHandler)
  
    clickrace.race = new com.pusher.clickrace.Race("a013bf0e5746f73cfdff");
    clickrace.race.load(clickrace.uniqueId, raceInfo);
    
    clickrace.save(function() {
      clickrace.setQuestionUI(raceInfo.question);
    });
    
    clickrace.race.bind('interest-updated', function(info) {
      $("#interest_count").text(info.count);
    });
    clickrace.race.bind('runner-added', clickrace.runnerAdded);
    clickrace.race.bind('runner-removed', clickrace.runnerRemoved);
    clickrace.race.bind('race-won', clickrace.raceWon)
  };

  clickrace.runnerAdded = function(runner) {
    var runnerEl = $("<li>" + 
      "<div class='distance'></div>" +
      "<div class='content'>" +
        "<span class='name'>" + runner.info.name + "</span> <span class='velocity'>0</span> cps" +
      "</div>" +
      "</li>");
    runnerEl.attr("data-runner-id", runner.id);
    $("#chosen_question .runners").append(runnerEl);
  };

  clickrace.runnerRemoved = function(runner) {
    clickrace.getRunnerEl(runner.id).remove();
  };
  
  clickrace.raceWon = function(update) {
    var winner = clickrace.getRunnerEl(update.winner);
    winner.addClass('winner');
    winner.find(".distance").animate({width: "100%"}, 'slow');
    
    clickrace.setRaceState(clickrace.raceStates.finished);
    
    if(update.winner === clickrace.race.runnerName) {
      clickrace.save();
    }
  };
  
  clickrace.getRunnerEl = function(id) {
    return $("#chosen_question .runners li[data-runner-id='" + id + "']");
  };
  
  clickrace.joinRaceHandler = function(ev) {
    var runnerName = $.trim($("#your_name").val());
    if(runnerName.length < 2){
      alert("Please enter at least 2 characters to identify yourself.")
    }
    else {
      clickrace.race.join(runnerName);
      
      clickrace.setRaceState(clickrace.raceStates.waitingForRunners);
      
      if(clickrace.userType !== clickrace.userTypes.organiser) {
        clickrace.setUserType(clickrace.userTypes.runner);
      }
      else {
        $("#start_race_btn").click(clickrace.startRaceHandler);
      }
      
      $("#join_race").slideUp();
      
      clickrace.monitorClicks();
      clickrace.race.bind('race-starts-in', clickrace.raceStartsIn);
    }
  };
  
  clickrace.startRaceHandler = function() {
    $("#organiser_zone").slideUp();
    clickrace.race.ready()
  };
  
  clickrace.raceStartsIn = function(ev) {
    if(ev.startsIn === 0) {
      // TODO: organiser has too big an advantage here
      clickrace.setRaceState(clickrace.raceStates.running);
      $("#race_announcements").text("Go!");
    }
    else {
      $("#race_announcements").text("Race to start in " + ev.startsIn);
    }
  };
  
  clickrace.monitorClicks = function() {
    clickrace.race.bind('click-velocity-updated', function(ev){
      var el = clickrace.getRunnerEl(ev.runner);
      el.find(".velocity").text(ev.velocity);
      var percent = Math.min(100, (ev.distance/clickrace.race.raceDistance) * 100);
      el.find(".distance").animate({width:percent + "%"}, 'slow');
    });
    
    $("#click_race_btn").click(function(){
      clickrace.race.click();
    })
  };

  clickrace.setUpUniqueId();
  clickrace.addBehaviours();
});