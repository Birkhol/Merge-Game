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
    dom: {
        createContainer: true
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
let gameStarted = false;
let deathLine = 75;
let restartButton;
let endGameUI = [];
let menuUI = [];
let overlay;
let highscore = 0;
let highscoreText;
let ignoreNextPress = false;
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

    scoreText = this.add.text(config.width - 10, 35, 'Score: 0', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff'
    });
    scoreText.setOrigin(1, 0);
    scoreText.setDepth(1000);
    
    highscore = localStorage.getItem('highscore') || 0;
    highscore = parseInt(highscore);

    highscoreText = this.add.text(config.width - 10, 5, 'Highscore: ' + highscore, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffff00'
    });
    highscoreText.setOrigin(1, 0);
    highscoreText.setDepth(1000);
    
    this.matter.world.setBounds(0, 0, config.width, config.height);

    showMenu(this);

    if (gameOver) return;
    
    if (gameStarted) {
        spawnFruit(this);
    }
    

    this.input.on("pointerdown", () => {

        if (!gameStarted) return;
        // Ignores first mouse click to prevent instant fruit drop on restarting or starting game
        if (ignoreNextPress) {
            ignoreNextPress = false;
            return;
        }

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
    if(gameOver) {
        if(currentFruit) {
            currentFruit.destroy();
            currentFruit = null;
        }
    
    // Create a semi-transparent dark overlay
    overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.75)
        .setOrigin(0, 0)
        .setDepth(0); // make sure it's behind UI texts
    endGameUI.push(overlay);

    // Freeze all fruits
    fruits.forEach(f => { if (f.body) f.setStatic(true); });
    aboveDeathLineTimer.clear();
    
    // Save highscore
    let savedHighscore = localStorage.getItem('highscore') || 0;
    savedHighscore = parseInt(savedHighscore);
    if (score > savedHighscore) {
        localStorage.setItem('highscore', score);
        savedHighscore = score;
    }

    // Submit score to backend
    const playerName = localStorage.getItem('playerName');
    if (playerName) {
        submitScore(playerName, score);
    }

    // Update global and ingame UI
    highscore = savedHighscore;
    highscoreText.setText('Highscore: ' + highscore);


    // Show Game Over text
    gameOverText = scene.add.text(config.width / 2, config.height / 2 - 200, "Game Over", {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ff0000',
    });
    gameOverText.setOrigin(0.5);
    endGameUI.push(gameOverText);  

    // Show highscore
    const highscoreTextMenu = scene.add.text(config.width / 2, config.height / 2 - 100, 'Highscore: ' + highscore, {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffff00',
    }).setOrigin(0.5);
    endGameUI.push(highscoreTextMenu);

    submitScore();


    // Create Restart Button
    restartButton = scene.add.text(config.width / 2, config.height / 2 + 100, 'Restart', {
        fontSize: '52px',
        fontFamily: 'Arial',
        color: '#00ff00ff',
        backgroundColor: '#444444ff',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();

    restartButton.on('pointerdown', () => {
        ignoreNextPress = true;
        restartGame(scene);
    });
    endGameUI.push(restartButton);

    const menuButton = scene.add.text(config.width / 2, config.height / 2 + 180, 'Menu', {
    fontSize: '32px',
    fontFamily: 'Arial',
    color: '#00ffff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
}).setOrigin(0.5).setInteractive();

menuButton.on('pointerdown', () => {
    // Remove end game UI
    endGameUI.forEach(obj => obj.destroy());
    endGameUI = [];

    // Destroy any remaining fruits
    fruits.forEach(f => f.destroy());
    fruits = [];
    if (currentFruit) {
        currentFruit.destroy();
        currentFruit = null;
    }

    // Show menu again
    showMenu(scene);
});

endGameUI.push(menuButton);
    }
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

function restartGame(scene) {
    // Remove all fruits
    fruits.forEach(f => f.destroy());
    fruits = [];

    // Destroy all end-game UI
    endGameUI.forEach(obj => obj.destroy());
    endGameUI = [];
    overlay = null;
    gameOver = false;

    // Reset score
    score = 0;
    scoreText.setText('Score: 0');

    // Reset merge index
    maxUnlockedIndex = 0;
    gameStarted = true;

    // Spawn the first fruit
    spawnFruit(scene);
}

// Menu function
function showMenu(scene) {
    maxUnlockedIndex = 0;
    gameStarted = false;

    // Reset score
    score = 0;
    scoreText.setText('Score: 0');

    // Create a dark overlay
    overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55)
        .setOrigin(0, 0)
        .setDepth(0);
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, config.height / 2 - 130, 'Merge Game', {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff'
    }).setOrigin(0.5);
    menuUI.push(title);

    // Check if username is already saved
    let playerName = localStorage.getItem("playerName");

    if (!playerName) {
        const nameLabel = scene.add.text(config.width / 2, config.height / 2 - 60, 'Enter your name:', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        menuUI.push(nameLabel);

        // Create a DOM input box
        const nameInput = scene.add.dom(config.width / 2, config.height / 2, 'input', {
            type: 'text',
            fontSize: '20px',
            padding: '5px',
            width: '200px'
        });
        menuUI.push(nameInput);

        const saveButton = scene.add.text(config.width / 2, config.height / 2 + 60, 'Save Name', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        saveButton.on('pointerdown', () => {
            let enteredName = nameInput.node.value.trim();
            if (enteredName.length > 0) {
                localStorage.setItem("playerName", enteredName);
                // Clear menu and reload it
                menuUI.forEach(obj => obj.destroy());
                menuUI = [];
                showMenu(scene);
            }
        });

        menuUI.push(saveButton);

    } else {

    const playButton = scene.add.text(config.width / 2, config.height / 2, 'Play', {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();

    playButton.on('pointerdown', () => {
        // remove menu UI
        menuUI.forEach(obj => obj.destroy());
        menuUI = [];

        startGame(scene);
    });

    menuUI.push(playButton);
    }
    
    const leaderboardButton = scene.add.text(config.width / 2, config.height / 2 + 80, 'Leaderboard', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#00ffff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
}).setOrigin(0.5).setInteractive();

leaderboardButton.on('pointerdown', async () => {
    // remove menu UI
    menuUI.forEach(obj => obj.destroy());
    menuUI = [];

    // show leaderboard
    await showLeaderboard(scene);
});

menuUI.push(leaderboardButton);

}

function startGame(scene) {
    gameOver = false;

    // Reset score and fruits
    score = 0;
    scoreText.setText('Score: 0');
    fruits.forEach(f => f.destroy());
    fruits = [];

    // Spawn first fruit
    spawnFruit(scene);

    ignoreNextPress = true;
    gameStarted = true;
}

async function submitScore(playerName, score) {
    try {
        const response = await fetch("http://localhost:3000/highscore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: playerName, score })
        });
        const data = await response.json();
        console.log("Score submitted:", data);
    } catch (err) {
        console.error("Failed to submit score:", err);
    }
}

async function showLeaderboard(scene) {
    // Create a semi-transparent overlay
    const overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.7)
        .setOrigin(0, 0);
    
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, 50, 'Leaderboard', {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff'
    }).setOrigin(0.5);
    menuUI.push(title);

    try {
        const response = await fetch('http://localhost:3000/leaderboard');
        const data = await response.json(); // expect an array of { username, score }
        
        // Show top 10 scores
        data.slice(0, 10).forEach((entry, index) => {
            const text = scene.add.text(config.width / 2, 120 + index * 40, `${index+1}. ${entry.playerName}: ${entry.score}`, {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffff00'
            }).setOrigin(0.5);
            menuUI.push(text);
        });

    } catch (err) {
        console.error('Failed to load leaderboard:', err);
    }

    // Back button to return to menu
    const backButton = scene.add.text(config.width / 2, config.height - 80, 'Back', {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();

    backButton.on('pointerdown', () => {
        menuUI.forEach(obj => obj.destroy());
        menuUI = [];
        showMenu(scene);
    });

    menuUI.push(backButton);
}
