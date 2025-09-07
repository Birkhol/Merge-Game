var config = {
    type: Phaser.AUTO,
    width: 500,
    height: 700,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 2 },
            debug: false
        }
    },
    scale: {
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 500,
        height: 700
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let fruits = [];
let fruitTypes = ["tomato", "apple", "peach", "watermelon", "orange", "plum", "avocado", "strawberry", "pineapple", "dragonfruit"];
let maxUnlockedIndex = 0;
let currentFruit = null;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;
let gameOverText;
let deathLine = 70;
let aboveDeathLineTimer = new Map();

function preload() {
    this.load.image('background', 'Assets/BlueBackground.jpg');
    this.load.image('tomato', 'Assets/Tomato.png');
    this.load.image('apple', 'Assets/Apple.png');
    this.load.image('peach', 'Assets/Peach.png');
    this.load.image('watermelon', 'Assets/Watermelon.png');
    this.load.image('orange', 'Assets/Orange.png');
    this.load.image('plum', 'Assets/Plum.png');
    this.load.image('avocado', 'Assets/Avocado.png');
    this.load.image('strawberry', 'Assets/Strawberry.png');
    this.load.image('pineapple', 'Assets/Pineapple.png');
    this.load.image('dragonfruit', 'Assets/Dragonfruit.png');
}

function create() {
    
    this.add.image(config.width/2, config.height/2, 'background');

    let graphics = this.add.graphics();
    graphics.lineStyle(2, 0xff0000, 1);
    graphics.beginPath();
    graphics.moveTo(0, deathLine);
    graphics.lineTo(config.width, deathLine);
    graphics.strokePath();

    scoreText = this.add.text(config.width - 10, 10, 'Score: 0', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff'
    });
    scoreText.setOrigin(1, 0);
    
    
    this.matter.world.setBounds(0, 0, config.width, config.height);

    if (gameOver) return;
    
    spawnFruit(this);

    this.input.on("pointerdown", () => {
        if (currentFruit) {
            if(canDrop(currentFruit, fruits)) {
            currentFruit.setStatic(false); // let it fall
            fruits.push(currentFruit);
            currentFruit.body.isSensor = false;
            currentFruit.isActive = true;
            currentFruit = null;

            // spawn a new one after short delay
            this.time.delayedCall(500, () => {
                spawnFruit(this);
            });
        } else {
            console.log("Cannot drop here: overlapping!");
        }
        }
    });

    // Collision for merging
    this.matter.world.on("collisionstart", (event) => {
        let pairs = event.pairs;
        pairs.forEach(pair => {
            let bodyA = pair.bodyA;
            let bodyB = pair.bodyB;

            if (bodyA.gameObject && bodyB.gameObject) {
                let f1 = bodyA.gameObject;
                let f2 = bodyB.gameObject;

                // check same texture key (same fruit type)
                if (f1.isActive &&  f2.isActive && f1.texture.key === f2.texture.key) {
                    mergeFruits(this, f1, f2);
                }
            }
        });
    });
    this.children.bringToTop(scoreText);
}

function update(time, delta) {

    if (gameOver) return;

    if (currentFruit) {
        // follow mouse x-position
        currentFruit.setPosition(this.input.activePointer.x, 20);
    } 

    for (let i = 0; i < fruits.length; i++) {
        let fruit = fruits[i];
        if (fruit.body && fruit.body.bounds) {

        let topY = fruit.body.bounds.min.y;

        if (!fruit.active) continue;

        if (topY < deathLine) {
            const prev = aboveDeathLineTimer.get(fruit) || 0;
            const timeNow = prev + delta;
            aboveDeathLineTimer.set(fruit, timeNow);

            if(timeNow >= 1000) { // Ends game if fruit has been above line for 1 second
                endGame(this);
                break;
            }  
        } else {
            if (aboveDeathLineTimer.has(fruit)) aboveDeathLineTimer.delete(fruit); // Reset timer when fruit goes below line
        }
    }
    }
}

function dropFruit(scene) {
    if (gameOver) return;
    let type = Phaser.Utils.Array.GetRandom(fruitTypes);
    let fruit = scene.physics.add.image(240, 50, type);
    fruit.setCollideWorldBounds(true);
    fruit.setBounce(0.05);
    fruits.push(fruit);
}

function mergeFruits(scene, f1, f2) {
    if (gameOver) return;
    // find index of current fruit type
    let idx = fruitTypes.indexOf(f1.texture.key);
    if (idx === fruitTypes.length - 1) {
        f1.destroy();
        f2.destroy();
        score += (idx + 1) * 10;
        scoreText.setText('Score: ' + score);
        return;
    }

    // next fruit type
    let nextType = fruitTypes[idx + 1];
    let x = (f1.x + f2.x) / 2;
    let y = (f1.y + f2.y) / 2;

    // Remove timers
    aboveDeathLineTimer.delete(f1);
    aboveDeathLineTimer.delete(f2);

    // destroy old fruits
    f1.destroy();
    f2.destroy();

    // spawn new merged fuit
    let newFruit = scene.matter.add.image(x, y, nextType, null, {
        shape: "circle",
        restitution: 0.1
    });

    newFruit.isActive = true;
    fruits.push(newFruit);

    // Unlock next fruittype to spawn
    if (idx + 1 > maxUnlockedIndex) {
        maxUnlockedIndex = idx + 1;
    }
    
    score += (idx + 1) * 10;
    scoreText.setText('Score: ' + score);
}

function spawnFruit(scene) {
    if (gameOver) return;
    let allowedFruits;
    if(maxUnlockedIndex === 9) {
        allowedFruits = fruitTypes.slice(0, maxUnlockedIndex - 1);
    } else {
        allowedFruits = fruitTypes.slice(0, maxUnlockedIndex + 1);
    }
    
    let type = Phaser.Utils.Array.GetRandom(allowedFruits);

    currentFruit = scene.matter.add.image(config.width/2, 20, type, null, {
        shape: "circle",
        restitution: 0.1  // bounciness
    });

    currentFruit.setStatic(true);
    currentFruit.body.isSensor = true;
    currentFruit.isActive = false;
}

function endGame(scene) {
    gameOver = true;

    // Freeze all fruits
    fruits.forEach(f => { if (f.body) f.setStatic(true); });
    aboveDeathLineTimer.clear();

    // Show Game Over text
    gameOverText = scene.add.text(config.width / 2, config.height / 2, "Game Over", {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ff0000'
    });
    gameOverText.setOrigin(0.5);

    currentFruit = null;
}

function canDrop(fruit, others) {
    for (const other of others) {
        if (!other.active || other === fruit) continue;

        // Check if fruit would overlap other
        const collisions = Phaser.Physics.Matter.Matter.Query.collides(fruit.body, [other.body]);
        if (collisions.length > 0) {
            return false; // overlapping
        }
    }
    return true; // safe to drop
}


