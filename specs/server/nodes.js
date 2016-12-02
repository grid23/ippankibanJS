"use strict"

const chai = require("chai")
const klass = require("../../lib/class").class
const Node = require("../../lib/Node").Node

describe("Node", ()=>{
    describe("new Node", ()=>{
        it ("creates and returns a node instance", ()=>{
            var node = new Node

            chai.expect(Node.isImplementedBy(node)).to.be.true
        })
    })

    describe("parent_node.appendChild(node), parent_node.insertBefore(node), node.childNodes, node.parentNode, node.nextSibling, node.previousSibling", ()=>{
        it ("add nodes to the parent node, get children list, get parent, get siblings", ()=>{
            var parent = new Node
            var child_a = new Node
            var child_b = new Node
            var child_c = new Node

            parent.appendChild(child_a)
            chai.expect(parent.childNodes.length).to.equal(1)
            parent.appendChild(child_c)
            chai.expect(parent.childNodes.length).to.equal(2)
            chai.expect(parent.childNodes[0]).to.equal(child_a)
            chai.expect(parent.childNodes[1]).to.equal(child_c)
            parent.insertBefore(child_b, child_c)
            chai.expect(parent.childNodes.length).to.equal(3)
            chai.expect(parent.childNodes[1]).to.equal(child_b)

            chai.expect(child_a.parentNode).to.equal(parent)
            chai.expect(child_b.parentNode).to.equal(parent)
            chai.expect(child_c.parentNode).to.equal(parent)

            chai.expect(child_b.previousSibling).to.equal(child_a)
            chai.expect(child_b.nextSibling).to.equal(child_c)
        })
    })

})
