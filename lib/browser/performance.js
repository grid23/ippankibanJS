"use strict"

module.exports.now = window.performance && window.performance.now
                   ? () => performance.now()
                   : () => Date.now()
