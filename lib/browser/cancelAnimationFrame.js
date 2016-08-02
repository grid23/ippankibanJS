"use strict"

const AnimationLoop = require("./AnimationLoop").AnimationLoop
const animationLoop = new AnimationLoop

module.exports.cancelAnimationFrame = animationLoop.cancelAnimationFrame.bind(animationLoop)
