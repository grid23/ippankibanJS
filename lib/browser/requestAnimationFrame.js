"use strict"

const AnimationLoop = require("./AnimationLoop").AnimationLoop
const animationLoop = new AnimationLoop

module.exports.requestAnimationFrame = animationLoop.requestAnimationFrame.bind(animationLoop)
module.exports.requestAnimationFrames = animationLoop.requestAnimationFrames.bind(animationLoop)
