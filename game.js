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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let fruits = [];
let fruitTypes = ["tomato", "apple", "peach", "watermelon", "orange", "plum"];
let maxUnlockedIndex = 0;
let currentFruit = null;
let cursors;

function preload() {
    this.load.image('background', 'assets/BlueBackground.jpg'),
    this.load.image('tomato', 'assets/tomato.png'),
    this.load.image('apple', 'assets/apple.png'),
    this.load.image('peach', 'assets/peach.png'),
    this.load.image('watermelon', 'assets/watermelon.png')
    this.load.image('orange', 'assets/orange.png')
    this.load.image('plum', 'assets/plum.png')
}

function create() {
    
    this.add.image(config.width/2, config.height/2, 'background'),
    
    this.matter.world.setBounds(0, 0, config.width, config.height);

    spawnFruit(this);

    this.input.on("pointerdown", () => {
        if (currentFruit) {
            currentFruit.setStatic(false); // let it fall
            fruits.push(currentFruit);
            currentFruit = null;

            // spawn a new one after short delay
            this.time.delayedCall(500, () => {
                spawnFruit(this);
            });
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
                if (f1.texture.key === f2.texture.key) {
                    mergeFruits(this, f1, f2);
                }
            }
        });
    });
}

function update() {

    if (currentFruit) {
        // follow mouse x-position, but stay at the top
        currentFruit.setPosition(this.input.activePointer.x, 20);
    } 
}

function dropFruit(scene) {
    let type = Phaser.Utils.Array.GetRandom(fruitTypes);
    let fruit = scene.physics.add.image(240, 50, type);
    fruit.setCollideWorldBounds(true);
    fruit.setBounce(0.05);
    fruits.push(fruit);
}

function mergeFruits(scene, f1, f2) {
    // find index of current fruit type
    let idx = fruitTypes.indexOf(f1.texture.key);
    if (idx === -1 || idx === fruitTypes.length - 1) {
        return; // cannot merge further
    }

    // next fruit type
    let nextType = fruitTypes[idx + 1];
    let x = (f1.x + f2.x) / 2;
    let y = (f1.y + f2.y) / 2;

    // destroy old fruits
    f1.destroy();
    f2.destroy();

    // spawn new merged fuit
    let newFruit = scene.matter.add.image(x, y, nextType, null, {
        shape: "circle",
        restitution: 0.1
    });

    fruits.push(newFruit);

    // Unlock next fruittype to spawn
    if (idx + 1 > maxUnlockedIndex) {
        maxUnlockedIndex = idx + 1;
    }
}

function spawnFruit(scene) {
    let allowedFruits = fruitTypes.slice(0, maxUnlockedIndex + 1);
    let type = Phaser.Utils.Array.GetRandom(allowedFruits);

    currentFruit = scene.matter.add.image(config.width/2, 20, type, null, {
        shape: "circle",
        restitution: 0.1  // bounciness
    });

    currentFruit.setStatic(true);
}