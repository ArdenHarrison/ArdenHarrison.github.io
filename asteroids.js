
class Vector {
    x = 0
    y = 0
    constructor(x, y) {
        this.x = x
        this.y = y
    }
    getCopy() {
        return new Vector(this.x, this.y)
    }
    add(value) {
        if(typeof value == "number") {
            return new Vector(this.x + value, this.y + value)
        } else if(value.constructor.name == "Vector") {
            return new Vector(this.x + value.x, this.y + value.y)
        }
    }
    subtract(value) {
        if(typeof value == "number") {
            return new Vector(this.x - value, this.y - value)
        } else if(value.constructor.name == "Vector") {
            return new Vector(this.x - value.x, this.y - value.y)
        }
    }
    multiply(value) {
        return new Vector(this.x * value, this.y * value)
    }
    magnitude() {
        return Math.sqrt(this.x**2 + this.y**2)
    }
    normalized() {
        var m = this.magnitude()
        if(m > 0) {
            return new Vector(this.x/m, this.y/m)
        }
        return new Vector(0,0)
    }
    dotProduct(value) {
        if(typeof value == "number") {
            return this.normalized().dotProduct(new Vector(1,0).rotate(value))
        } else {
            return this.x*value.x + this.y*value.y
        }
    }
    rotate(angle) {
        var cosTheta = Math.cos(angle)
        var sinTheta = Math.sin(angle)
        return new Vector(this.x*cosTheta - this.y*sinTheta, this.x*sinTheta + this.y*cosTheta)
    }
    getAngle() {
        var a = this.normalized()
        var b = a.dotProduct(new Vector(1,0))
        var c = Math.acos(b)
        return c//Math.acos(this.normalized().dotProduct(new Vector(1,0)))
    }
    scalarProjection(value) {
        return this.dotProduct(value)*this.magnitude()
    }
}

class RigidBody {
    position = new Vector(0,0)
    radius = 1.0
    velocity = new Vector(0,0)
    force = new Vector(0,0)
    collided = false // Did the body collide with another body this tick
    constructor(position, radius, velocity) {
        this.position = position
        this.radius = radius
        this.velocity = velocity
    }
    area() {
        return this.radius**2 * Math.PI
    }
    processCollisions(possibleColliders) {
        var i = 0
        while(i != -1) {
            i = this.checkForCollisions(possibleColliders, i)
            
            if(i != -1) {
                // Offset
                this.position = this.position.subtract(possibleColliders[i].position).normalized().multiply(this.radius + possibleColliders[i].radius).add(possibleColliders[i].position)

                // Bounce
                var tmpV = this.velocity
                var tmpP = this.position
                this.bounce(possibleColliders[i].velocity, possibleColliders[i].area(), possibleColliders[i].position)
                possibleColliders[i].bounce(tmpV, this.area(), tmpP)

                // Mark the bodies for collision handling
                this.collided = true
                possibleColliders[i].collided = true

                possibleColliders.splice(i, 1) // We won't check for collisions with this body again this tick
            } 
        }
        return possibleColliders
    }
    checkForCollisions(possibleColliders, startAt) {
        var i = startAt
        var n = possibleColliders.length
        while(i < n) {
            var displacement = this.position.subtract(possibleColliders[i].position)
            var distance = displacement.magnitude()
            if(distance < this.radius + possibleColliders[i].radius) { // Collision detected!
                return i
            }
            i += 1
        }
        return -1
    }
    bounce(v2, m2, p2) {
        var v1 = this.velocity
        var m1 = this.area()
        var p1 = this.position
        // This big line is the elastic collision formula
        this.velocity = v1.subtract(p1.subtract(p2).multiply(v1.subtract(v2).dotProduct(p1.subtract(p2))/p1.subtract(p2).magnitude()**2).multiply((2*m2)/(m1+m2)))
        return this
    }
    checkBoundaryIntersection() {
        var intersections = {
            x: 0, // 0: No intersections with the left/right boundary, -1: Intersecting the left boundary, 1: Intersecting the right boundary
            y: 0, // 0: No intersections with the top/bottom boundary, -1: Intersecting the top boundary, 1: Intersecting the bottom boundary
            c: false // Is the body intersecting a world corner
        }
        if(this.position.x < worldBoundary.x + this.radius) {
            intersections.x = -1
        } else if(this.position.x > worldBoundary.x + worldBoundary.w - this.radius) {
            intersections.x = 1
        }
        if(this.position.y < worldBoundary.y + this.radius) {
            intersections.y = -1
        } else if(this.position.y > worldBoundary.y + worldBoundary.h - this.radius) {
            intersections.y = 1
        }
        
        if(intersections.x != 0 && intersections.y != 0) {
            // We can use pythagoras to determine if the body is intersecting a corner
            var a
            var b
            if(intersections.x == -1) {
                a = this.position.x - worldBoundary.x
            } else {
                a = worldBoundary.x + worldBoundary.w - this.position.x
            }
            if(intersections.y == -1) {
                b = this.position.y - worldBoundary.y
            } else {
                b = worldBoundary.y + worldBoundary.h - this.position.y
            }

            if(this.radius > Math.sqrt(a**2 + b**2)) {
                intersections.c = true
            }
        }
        return intersections
    }
}

class Asteroid extends RigidBody {
    colour = "#FFFFFF"
    spawning = true
    targetRadius = 50
    minimumRadius = 10
    growthRate = 0.5
    hitPoints = 1
    
    constructor(position, targetRadius, velocity, colour, spawning) {
        if(spawning) {
            super(position, targetRadius/10, velocity)
        } else {
            super(position, targetRadius, velocity)
        }
        this.spawning = spawning
        this.targetRadius = targetRadius
        this.colour = colour
        this.hitPoints = Math.ceil(targetRadius/10)
    }
    process(delta) {
        if(this.spawning) {
            this.grow(delta)
        }
    }
    collisionHandler() {
        if(!this.spawning) {
            this.hitPoints -= 1
        }
        if(this.hitPoints <= 0) {
            this.shatter()
        }
        this.collided = false
    }
    draw(delta, pos) {
        context2D.lineWidth = 2
        context2D.strokeStyle = this.colour
        context2D.beginPath()
        context2D.arc(pos.x, pos.y, this.radius, 0,2*Math.PI)
        context2D.stroke()
    }
    grow(delta) {
        this.radius += this.growthRate * this.targetRadius * delta
        if(this.radius >= this.targetRadius) {
            this.radius = this.targetRadius
            this.spawning = false
        }
    }
    shatter() {
        var childRadius = this.targetRadius/2
        var i = 0
        var n = 3
        if(childRadius >= this.minimumRadius) {
            while(i < n) {
                var theta = ((2*Math.PI)/3) * i
                var relativePos = this.velocity.normalized().rotate(theta).multiply(this.radius)
                var pos = this.position.add(relativePos)
                var relativeVelocity = relativePos.normalized().multiply(30)
                var velocity = this.velocity.add(relativeVelocity)
                
                actors.push(new Asteroid(pos, childRadius, velocity, "#FF4444", false))

                i += 1
            }
        }
        actors.splice(actors.indexOf(this), 1)
    }
}

class Shuttle extends RigidBody {
    colour = "#5555FF"
    leftThruster = false
    rightThruster = false
    angle = 0 // In PI Radians
    forwardThrust = 100
    rotationalThrust = 1.2
    turningForwardThrust = 20
    constructor(position) {
        super(position, 40, new Vector(0,0))
    }
    process(delta) {
        this.thrust(delta)
    }
    collisionHandler() {
        this.collided = false
    }
    draw(delta, pos) {
        context2D.lineWidth = 2
        context2D.strokeStyle = this.colour
        context2D.fillStyle = this.colour
        context2D.beginPath()
        context2D.arc(pos.x, pos.y, this.radius, 0,2*Math.PI)
        context2D.stroke()

        context2D.beginPath()
        context2D.arc(pos.x, pos.y, this.radius, -0.1 + Math.PI*this.angle, 0.1 + Math.PI*this.angle)
        context2D.lineTo(pos.x, pos.y)
        context2D.fill()
    }
    thrust(delta) {
        if(this.leftThruster && this.rightThruster) { // Full speed ahead
            this.force = new Vector(this.forwardThrust,0).rotate(this.angle*Math.PI)
        } else if(this.leftThruster) { // Turn to the right
            this.angle += this.rotationalThrust * delta
            this.force = new Vector(this.turningForwardThrust,0).rotate(this.angle*Math.PI)
        } else if (this.rightThruster) { // The other way
            this.angle -= this.rotationalThrust * delta
            this.force = new Vector(this.turningForwardThrust,0).rotate(this.angle*Math.PI)
        } else {
            this.force = new Vector(0,0)
        }
        //console.log("Speed: " + String(this.velocity.magnitude()))
    }
    thrustMultiplier() {
        var a = 100
        var b = this.velocity.scalarProjection(this.angle*Math.PI)
        var c = a - b
        if(c < 0) {c = 0}
        console.log("Multiplier: " + String(c))
        return c
    }
}

const tickrate = 30 // MILLISECONDS
var lastTick

const worldBoundary = {
    x: 0,
    y: 0,
    w: 720,
    h: 1280
}

const fullscreenButton = {
    x: 0,
    y: 0,
    w: 100,
    h: 100
}

var canvas
var context2D

var actors = []
var player

const spawnrate = 1000


function startup() {
    canvas = document.getElementById("asteroidsCanvas")
    context2D = canvas.getContext("2d")


    document.addEventListener("keydown", function(event){
        if(event.key == "ArrowLeft") {
            player.leftThruster = true
        }
        if(event.key == "ArrowRight") {
            player.rightThruster = true
        }
    })
    document.addEventListener("keyup", function(event){
        if(event.key == "ArrowLeft") {
            player.leftThruster = false
        }
        if(event.key == "ArrowRight") {
            player.rightThruster = false
        }
    })

    canvas.addEventListener("touchstart", touchHandler)
    canvas.addEventListener("touchmove", touchHandler)
    canvas.addEventListener("touchend", touchHandler)
    canvas.addEventListener("touchcancel", touchHandler)

    canvas.addEventListener("click", clickHandler)

    var a = canvas.msRequestFullscreen

    toggleFullscreen()

    player = new Shuttle(new Vector(360, 340))
    actors.push(player)

    lastTick = Date.now()
    window.setInterval(process, tickrate)
    window.setInterval(spawnAsteroid, spawnrate)
}


function clickHandler(event) {
    console.log(event.offsetX)
}

function touchHandler(event) {
    var touches = [...event.targetTouches]
    player.leftThruster = false
    player.rightThruster = false

    var i = 0
    var n = touches.length
    while(i < n) {
        // Is the user touching the fullscreen button
        var posX = ((touches[i].pageX - canvas.offsetLeft)/canvas.offsetWidth) * worldBoundary.w
        var posY = ((touches[i].pageY - canvas.offsetTop)/canvas.offsetHeight) * worldBoundary.h
        if(posX >= fullscreenButton.x && posX <= fullscreenButton.x + fullscreenButton.w && posY >= fullscreenButton.y && posY <= fullscreenButton.y + fullscreenButton.h) {
            toggleFullscreen()
        } else {
            if(touches[i].pageX <= canvas.offsetLeft + canvas.offsetWidth/2) {
                player.leftThruster = true
            } else {
                player.rightThruster = true
            }
        }
        i += 1
    }
}

var fullscreen = false

function toggleFullscreen() {
    if(fullscreen) {
        if(canvas.exitFullscreen) {
            canvas.exitFullscreen()
        } else if(canvas.webkitExitFullscreen) {
            canvas.webkitExitFullscreen()
        } else if(canvas.msExitFullscreen) {
            canvas.msExitFullscreen()
        }
    } else {
        if(canvas.requestFullscreen) {
            canvas.requestFullscreen()
        } else if(canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen()
        } else if(canvas.msRequestFullscreen) {
            canvas.msRequestFullscreen()
        }
    }
}


function process() {
    // Delta time is important for maintaining smooth motion and animation at varying frame rates
    var now = Date.now()
    var delta = (now - lastTick)/1000
    lastTick = now

    var i = 0
    var n = actors.length
    while(i < n) {
        actors[i].process(delta)
        i += 1
    }

    physicsProcess(delta)

    i = 0
    while(i < actors.length) {
        if(actors[i].collided) {
            actors[i].collisionHandler()
        }
        i += 1
    }

    draw(delta)
}


function spawnAsteroid() {
    var targetAsteroidCount = 20
    if(actors.length-1 < targetAsteroidCount) {
        var targetRadius = Math.floor(Math.random() * 31) + 30
        var pos = new Vector(Math.random() * worldBoundary.w + worldBoundary.x, Math.random() * worldBoundary.h + worldBoundary.y)
        var speed = Math.random() * 50
        var velocity = new Vector(1,0).rotate(Math.random() * 2 * Math.PI).multiply(speed)

        actors.push(new Asteroid(pos, targetRadius, velocity, "#FF4444", true))
    }
}


function physicsProcess(delta) {
    var i = 0
    var n = actors.length
    while(i < n) {
        // Apply force
        actors[i].velocity = actors[i].velocity.add(actors[i].force.multiply(delta))

        // Move actor
        actors[i].position = actors[i].position.add(actors[i].velocity.multiply(delta))

        // Check if actor has crossed world boundary
        if(actors[i].position.x < worldBoundary.x) {
            actors[i].position.x += worldBoundary.w
        } else if(actors[i].position.x > worldBoundary.x + worldBoundary.w) {
            actors[i].position.x -= worldBoundary.w
        }
        if(actors[i].position.y < worldBoundary.y) {
            actors[i].position.y += worldBoundary.h
        } else if(actors[i].position.y > worldBoundary.y + worldBoundary.h) {
            actors[i].position.y -= worldBoundary.h
        }

        // Get all possible colliders
        var possibleColliders = [...actors]
        possibleColliders.splice(i, 1)

        // Process collisions
        actors[i].processCollisions(possibleColliders)

        // As the world loops, we need to check for collisions through the world boundary
        var intersections = actors[i].checkBoundaryIntersection()
        if(intersections.x != 0) {
            actors[i].position.x -= worldBoundary.w * intersections.x
            actors[i].processCollisions(possibleColliders)
            actors[i].position.x += worldBoundary.w * intersections.x
        }
        if(intersections.y != 0) {
            actors[i].position.y -= worldBoundary.h * intersections.y
            actors[i].processCollisions(possibleColliders)
            actors[i].position.y += worldBoundary.h * intersections.y
        }
        if(intersections.c) {
            actors[i].position.x -= worldBoundary.w * intersections.x
            actors[i].position.y -= worldBoundary.h * intersections.y
            actors[i].processCollisions(possibleColliders)
            actors[i].position.x += worldBoundary.w * intersections.x
            actors[i].position.y += worldBoundary.h * intersections.y
        }
        
        

        i += 1
    }
}


function draw(delta) {

    // Draw background
    context2D.fillStyle = "#000000"
    context2D.fillRect(0,0, canvas.width,canvas.height)

    // Draw actors
    var i = 0
    var n = actors.length
    while(i < n) {
        actors[i].draw(delta, actors[i].position)

        // Let's draw actors around the world boundary
        var intersections = actors[i].checkBoundaryIntersection()
        if(intersections.x != 0) {
            actors[i].draw(delta, new Vector(actors[i].position.x - worldBoundary.w * intersections.x, actors[i].position.y))
        }
        if(intersections.y != 0) {
            actors[i].draw(delta, new Vector(actors[i].position.x, actors[i].position.y - worldBoundary.h * intersections.y))
        }
        if(intersections.c) {
            actors[i].draw(delta, new Vector(actors[i].position.x - worldBoundary.w * intersections.x, actors[i].position.y - worldBoundary.h * intersections.y))
        }
        
        i += 1
    }

}
