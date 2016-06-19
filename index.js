"use strict"

module.exports = {
    class: require("./lib/class.js")
  , errors: require("./lib/class.js")
  , Event: require("./lib/Event.js").Event
  , EventDispatcher: require("./lib/EventDispatcher.js").EventDispatcher
  , EventTarget: require("./lib/EventTarget.js").EventTarget
  , native: require("./lib/native.js").native
  , Node: require("./lib/Node.js").Node
  , Serializer: require("./lib/Serializer.js").Serializer
  , type: require("./lib/type.js").type
  , UID: require("./lib/UID.js").UID
  //, : require("./lib/.js")
}
