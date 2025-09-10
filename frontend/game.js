// #region Original code
/*var config = {
    type: Phaser.AUTO,
    width: 648,
    height: 1080,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 2 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 360,
            height: 504
        },
        max: {
            width: 2160,
            height: 3024
        }
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
let deathLineGraphics;
let gameOverText;
let gameStarted = false;
let deathLine = 75; // Default 75
let restartButton;
let endGameUI = [];
let menuUI = [];
let overlay;
let highscore = 0;
let highscoreText;
let quitButton;
let blockTimer = null;
let ignoreNextPress = false;
let aboveDeathLineTimer = new Map();

function preload() {
    this.load.image('background', 'Assets/BlueBackground.jpg');
    this.load.image('background2', 'Assets/BlueBackground2.png');
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
    this.load.audio("mergeSound", "Assets/MergePop.mp3");
    this.load.audio("mergeLastSound", "Assets/Ping.mp3");
}

function create() {
    
    this.add.image(config.width/2, config.height/2, 'background2');

    deathLineGraphics = this.add.graphics();
    deathLineGraphics.lineStyle(2, 0xff0000, 1);
    deathLineGraphics.beginPath();
    deathLineGraphics.moveTo(0, deathLine);
    deathLineGraphics.lineTo(config.width, deathLine);
    deathLineGraphics.strokePath();
    deathLineGraphics.setVisible(false);

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
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3
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

    if (gameOver || f1.isMerging || f2.isMerging || !f1 || !f2 || !f1.body || !f2.body) return;
    
    f1.isMerging = true;
    f2.isMerging = true;

    let idx = fruitTypes.indexOf(f1.texture.key);
    if (idx === fruitTypes.length - 1) {
        
        if (f1.body) scene.matter.world.remove(f1.body);
        if (f2.body) scene.matter.world.remove(f2.body);
        
        f1.setActive(false).setVisible(false).setSensor(true);
        f2.setActive(false).setVisible(false).setSensor(true);
        
        // Get middle position of fruits
        const x = (f1.x + f2.x) / 2;
        const y = (f1.y + f2.y) / 2;
        
        // Floating "+200" text
        const bonusText = scene.add.text(x, y, "+200", {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffd900ff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        scene.tweens.add({
            targets: bonusText,
            y: y - 50,
            alpha: 0,
            duration: 700,
            ease: 'Power1',
            onComplete: () => bonusText.destroy()
        });

        scene.sound.play("mergeSound", { volume: 0.5 });
        scene.sound.play("mergeLastSound", { volume: 0.2 });
        
        score += (idx + 11) * 10;
        scoreText.setText('Score: ' + score);  

        scene.time.delayedCall(160, () => {
            f1.destroy();
            f2.destroy();
        });    
        
        return;
    }
    
    

    // next fruit type
    let nextType = fruitTypes[idx + 1];
    let x = (f1.x + f2.x) / 2;
    let y = (f1.y + f2.y) / 2;

    // Remove timers
    aboveDeathLineTimer.delete(f1);
    aboveDeathLineTimer.delete(f2);

    f1.setActive(false).setVisible(false).setSensor(true);
    f2.setActive(false).setVisible(false).setSensor(true);
    scene.time.delayedCall(160, () => {
        if (f1.body) scene.matter.world.remove(f1.body);
        if (f2.body) scene.matter.world.remove(f2.body);
        f1.destroy();
        f2.destroy();
    });

    // spawn new merged fuit
    let newFruit = scene.matter.add.image(x, y, nextType, null, {
        shape: "circle",
        restitution: 0.1
    });

    newFruit.isActive = true;
    newFruit.isMerging = false;
    fruits.push(newFruit);

    // Animation and sound
    if (newFruit?.body) {
        playMergeAnimation(scene, newFruit);
    }
    scene.sound.play("mergeSound", { volume: 0.5 });

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
    
    if (quitButton) {
        quitButton.bg.setVisible(false);
        quitButton.label.setVisible(false);
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
        submitScore(scene, playerName, score);
    }

    // Update global and ingame UI
    highscore = savedHighscore;
    highscoreText.setText('Highscore: ' + highscore);


    // Show Game Over text
    gameOverText = scene.add.text(config.width / 2, config.height / 2 - 200, "Game Over", {
        fontSize: '50px',
        fontFamily: 'Arial',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
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

    // Restart the game button
    restartButton = createButton(scene, config.width / 2, config.height / 2 + 115, 200, 60, 0x4CAF50, '#ffffff', 'Restart', () => {
        ignoreNextPress = false;
        restartGame(scene);
    });
    endGameUI.push(restartButton.bg);
    endGameUI.push(restartButton.label);

    // Back to menu button
    const menuButton = createButton(scene, config.width / 2, config.height / 2 + 200, 180, 60, 0x282828, '#ffffff', 'Menu', () => {

    // Remove end game UI
    endGameUI.forEach(obj => obj.destroy());
    endGameUI = [];
    deathLineGraphics.setVisible(false);

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

endGameUI.push(menuButton.bg);
endGameUI.push(menuButton.label);
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

    quitButton.bg.setVisible(true);
    quitButton.label.setVisible(true);

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
    scoreText.setVisible(false);

    // Create a dark overlay
    overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55)
        .setOrigin(0, 0)
        .setDepth(0);
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, config.height / 2 - 180, 'Merge Game', {
        fontSize: '52px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
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

        const saveButton = createButton(scene, config.width / 2, config.height / 2 + 60, 220, 60, 0x4CAF50, '#ffffff', 'Save Name', () => {

            let enteredName = nameInput.node.value.trim();
            if (enteredName.length > 0) {
                localStorage.setItem("playerName", enteredName);
                // Clear menu and reload it
                menuUI.forEach(obj => obj.destroy());
                menuUI = [];
                showMenu(scene);
            }
        });

        menuUI.push(saveButton.bg);
        menuUI.push(saveButton.label);

    } else {

    // Play button
    const playButton = createButton(scene, config.width / 2, config.height / 2, 180, 60, 0x4CAF50, '#ffffff', 'Play', () => {
        // remove menu UI
        menuUI.forEach(obj => obj.destroy());
        menuUI = [];

        startGame(scene);
    }
);

menuUI.push(playButton.bg);
menuUI.push(playButton.label);

    const leaderboardButton = createButton(scene, config.width / 2, config.height / 2 + 120, 220, 60, 0x27A3F5, '#ffffff', 'Leaderboard', async () => {

    // remove menu UI
    menuUI.forEach(obj => obj.destroy());
    menuUI = [];

    // show leaderboard
    await showLeaderboard(scene);
    }
);

menuUI.push(leaderboardButton.bg);
menuUI.push(leaderboardButton.label);

    }
}

function startGame(scene) {
    gameOver = false;
    deathLineGraphics.setVisible(true);
    scoreText.setVisible(true);

    // Reset score and fruits
    score = 0;
    scoreText.setText('Score: 0');
    fruits.forEach(f => f.destroy());
    fruits = [];

    // Spawn first fruit
    if (!gameOver) {
        spawnFruit(scene);
    }

    ignoreNextPress = false;
    gameStarted = true;

    // Quit button -> quits the current game and goes back to menu
    quitButton = createButton(scene, 30, 25, 50, 40, 0x303030, '#ffffff', 'Quit', () => {

        scene.tweens.killAll();
        scene.time.clearPendingEvents();
        deathLineGraphics.setVisible(false);

        // Remove all fruits
        fruits.forEach(f => f.destroy());
        fruits = [];

        // Destroy current fruit if exists
        if (currentFruit) {
            currentFruit.destroy();
            currentFruit = null;
        }

        const playerName = localStorage.getItem('playerName');
        if(score >= 1500 && playerName) {
            submitScore(scene, playerName, score);
        }

        // Remove end game UI if any
        endGameUI.forEach(obj => obj.destroy());
        endGameUI = [];

        // Go back to menu
        showMenu(scene);

        gameOver = true;
        gameStarted = false;
        
        quitButton.bg.destroy();
        quitButton.label.destroy();
    });
    
}

async function submitScore(scene, playerName, score) {
    try {
        const response = await fetch("https://merge-game.onrender.com/submit-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_name: playerName, score })
        });
        const data = await response.json();
        console.log("Score submitted:", data);

        const leaderBoardResponse = await fetch("https://merge-game.onrender.com/leaderboard");
        const top10 = await leaderBoardResponse.json();

        // Send notification if score was higher than 10th place on leaderboard
        const minTopScore = Math.min(...top10.map(entry => entry.score));
        if (score > minTopScore) {
            showLeaderboardNotification(scene, score);
        }
    } catch (err) {
        console.error("Failed to submit score:", err);
    }
}

async function showLeaderboard(scene) {

    deathLineGraphics.setVisible(false);

    // Create a semi-transparent overlay
    const overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.9)
        .setOrigin(0, 0);
    
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, 100, 'Leaderboard', {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff'
    }).setOrigin(0.5);
    menuUI.push(title);

    try {
        const response = await fetch('https://merge-game.onrender.com/leaderboard');
        const data = await response.json(); // expect an array of { username, score }
        
        // Show top 10 scores
        data.slice(0, 10).forEach((entry, index) => {
            const text = scene.add.text(config.width / 2, 175 + index * 40, `${index+1}. ${entry.player_name}: ${entry.score}`, {
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
    const backButton = createButton(scene, config.width / 2, config.height - 80, 180, 60, 0x4CAF50, '#ffffff', 'Back', () => {

        menuUI.forEach(obj => obj.destroy());
        menuUI = [];
        showMenu(scene);
    });

    menuUI.push(backButton.bg);
    menuUI.push(backButton.label);
}

function playMergeAnimation(scene, fruit) {
    if (!fruit || !fruit.body) return;

    fruit.setScale(0.5);
    scene.tweens.add({
        targets: fruit,
        scale: 1,
        duration: 150,
        ease: "Back.Out",
        onComplete: () => {
            if (fruit && fruit.setScale) {
                fruit.setScale(1);
            }
        }
    });
}

// Show a small "Score in top 10!" notification
function showLeaderboardNotification(scene, score) {
    const notif = scene.add.text(config.width - 20, config.height - 20, `${score} is in top 10, Saved to leaderboard!`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#eeff00ff',
        align: 'right'
    }).setOrigin(1, 1);

    // Tween to fade out after 6 seconds
    scene.tweens.add({
        targets: notif,
        alpha: 1,
        duration: 5300,
        ease: 'Power2',
        onComplete: () => notif.destroy()
    });
}

function createButton(scene, x, y, width, height, bgColor = 0x4CAF50, textColor = '#ffffff', text, callback) {
    // Button background
    const bg = scene.add.rectangle(x, y, width, height, bgColor, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.2) // subtle border
        .setInteractive({ useHandCursor: false })
        .setDepth(1001)

    // Button label
    const label = scene.add.text(x, y, text, {
        fontSize: `${Math.floor(height / 2.5)}px`,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: textColor,
        stroke: '#070707',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(1002);

    // Hover effect
    bg.on('pointerover', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1.05, duration: 150, ease: 'Power1' });
    });

    // Pointer out
    bg.on('pointerout', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1, duration: 150, ease: 'Power1' });
    });

    // Press down
    bg.on('pointerdown', () => {
        scene.tweens.add({ targets: [bg, label], scale: 0.95, duration: 100, ease: 'Power1' });
    });

    // Release
    bg.on('pointerup', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1.05, duration: 150, ease: 'Power1' });
        callback();
    });

    return { bg, label };
}*/
// #endregion

var config = {
    type: Phaser.AUTO,
    width: 648,
    height: 1080,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 2 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 360,
            height: 504
        },
        max: {
            width: 2160,
            height: 3024
        }
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
let fruitTypes = ["tomato2", "apple2", "peach2", "watermelon2", "orange2", "plum2", "avocado2", "strawberry2", "pineapple2", "dragonfruit2"];
let maxUnlockedIndex = 0;
let currentFruit = null;
let fruitHeight;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;
let deathLineGraphics;
let gameOverText;
let gameStarted = false;
let deathLine = 116; // Default 116
let restartButton;
let endGameUI = [];
let menuUI = [];
let overlay;
let highscore = 0;
let highscoreText;
let quitButton;
let blockTimer = null;
let ignoreNextPress = false;
let aboveDeathLineTimer = new Map();

function preload() {
    // Old fruit sprites
    this.load.image('background', 'Assets/BlueBackground.jpg');
    this.load.image('background2', 'Assets/BlueBackground2.png');
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
    this.load.audio("mergeSound", "Assets/MergePop.mp3");
    this.load.audio("mergeLastSound", "Assets/Ping.mp3");

    // Upscaled fruit sprites
    this.load.image('tomato2', 'Assets/Tomato2.png');
    this.load.image('apple2', 'Assets/Apple2.png');
    this.load.image('peach2', 'Assets/Peach2.png');
    this.load.image('watermelon2', 'Assets/Watermelon2.png');
    this.load.image('orange2', 'Assets/Orange2.png');
    this.load.image('plum2', 'Assets/Plum2.png');
    this.load.image('avocado2', 'Assets/Avocado2.png');
    this.load.image('strawberry2', 'Assets/Strawberry2.png');
    this.load.image('pineapple2', 'Assets/Pineapple2.png');
    this.load.image('dragonfruit2', 'Assets/Dragonfruit2.png');
}

function create() {
    
    this.add.image(config.width/2, config.height/2, 'background2');

    deathLineGraphics = this.add.graphics();
    deathLineGraphics.lineStyle(2, 0xff0000, 1);
    deathLineGraphics.beginPath();
    deathLineGraphics.moveTo(0, deathLine);
    deathLineGraphics.lineTo(config.width, deathLine);
    deathLineGraphics.strokePath();
    deathLineGraphics.setVisible(false);

    scoreText = this.add.text(config.width - 10, 55, 'Score: 0', {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ffffff'
    });
    scoreText.setOrigin(1, 0);
    scoreText.setDepth(1000);
    
    highscore = localStorage.getItem('highscore') || 0;
    highscore = parseInt(highscore);

    highscoreText = this.add.text(config.width - 10, 5, 'Highscore: ' + highscore, {
        fontSize: '30px',
        fontFamily: 'Arial',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3
    });
    highscoreText.setOrigin(1, 0);
    highscoreText.setDepth(1000);
    
    this.matter.world.setBounds(0, 0, config.width, config.height);

    showMenu(this);

    if (gameOver) return;
    
    if (gameStarted) {
        spawnFruit(this);
    }
    

    this.input.on("pointerdown", (pointer) => {

        if (!gameStarted) return;
        // Ignores first mouse click to prevent instant fruit drop on restarting or starting game
        if (ignoreNextPress) {
            ignoreNextPress = false;
            return;
        }

        if (currentFruit) {
            // Makes playing on touch screen easier
            currentFruit.setPosition(pointer.x, 20);

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

            if(timeNow >= 1600) { // Ends game if fruit has been above line for 1.6 seconds
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

    if (gameOver || f1.isMerging || f2.isMerging || !f1 || !f2 || !f1.body || !f2.body) return;
    
    f1.isMerging = true;
    f2.isMerging = true;

    let idx = fruitTypes.indexOf(f1.texture.key);
    if (idx === fruitTypes.length - 1) {
        
        if (f1.body) scene.matter.world.remove(f1.body);
        if (f2.body) scene.matter.world.remove(f2.body);
        
        f1.setActive(false).setVisible(false).setSensor(true);
        f2.setActive(false).setVisible(false).setSensor(true);
        
        // Get middle position of fruits
        const x = (f1.x + f2.x) / 2;
        const y = (f1.y + f2.y) / 2;
        
        // Floating "+200" text
        const bonusText = scene.add.text(x, y, "+200", {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffd900ff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        scene.tweens.add({
            targets: bonusText,
            y: y - 50,
            alpha: 0,
            duration: 700,
            ease: 'Power1',
            onComplete: () => bonusText.destroy()
        });

        scene.sound.play("mergeSound", { volume: 0.5 });
        scene.sound.play("mergeLastSound", { volume: 0.2 });
        
        score += (idx + 11) * 10;
        scoreText.setText('Score: ' + score);  

        scene.time.delayedCall(160, () => {
            f1.destroy();
            f2.destroy();
        });    
        
        return;
    }
    
    

    // next fruit type
    let nextType = fruitTypes[idx + 1];
    let x = (f1.x + f2.x) / 2;
    let y = (f1.y + f2.y) / 2;

    // Remove timers
    aboveDeathLineTimer.delete(f1);
    aboveDeathLineTimer.delete(f2);

    f1.setActive(false).setVisible(false).setSensor(true);
    f2.setActive(false).setVisible(false).setSensor(true);
    scene.time.delayedCall(160, () => {
        if (f1.body) scene.matter.world.remove(f1.body);
        if (f2.body) scene.matter.world.remove(f2.body);
        f1.destroy();
        f2.destroy();
    });

    // spawn new merged fuit
    let newFruit = scene.matter.add.image(x, y, nextType, null, {
        shape: "circle",
        restitution: 0.1
    });

    newFruit.isActive = true;
    newFruit.isMerging = false;
    fruits.push(newFruit);

    // Animation and sound
    if (newFruit?.body) {
        playMergeAnimation(scene, newFruit);
    }
    scene.sound.play("mergeSound", { volume: 0.5 });

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

    // Create a temporary fruit to measure its height
    const tempFruit = scene.matter.add.image(-50, -50, type, null, {
    shape: "circle",
    restitution: 0.1
    });
    tempFruit.setVisible(false);

    fruitHeight = scene.textures.get(type).getSourceImage().height / 2;
    tempFruit.destroy();

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
    
    if (quitButton) {
        quitButton.bg.setVisible(false);
        quitButton.label.setVisible(false);
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
        submitScore(scene, playerName, score);
    }

    // Update global and ingame UI
    highscore = savedHighscore;
    highscoreText.setText('Highscore: ' + highscore);


    // Show Game Over text
    gameOverText = scene.add.text(config.width / 2, config.height / 2 - 300, "Game Over", {
        fontSize: '70px',
        fontFamily: 'Arial',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
    });
    gameOverText.setOrigin(0.5);
    endGameUI.push(gameOverText);  

    // Show highscore
    const highscoreTextMenu = scene.add.text(config.width / 2, config.height / 2 - 150, 'Highscore: ' + highscore, {
        fontSize: '68px',
        fontFamily: 'Arial',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);
    endGameUI.push(highscoreTextMenu);

    // Restart the game button
    restartButton = createButton(scene, config.width / 2, config.height / 2 + 230, 300, 85, 0x4CAF50, '#ffffff', 'Restart', () => {
        ignoreNextPress = false;
        restartGame(scene);
    });
    endGameUI.push(restartButton.bg);
    endGameUI.push(restartButton.label);

    // Back to menu button
    const menuButton = createButton(scene, config.width / 2, config.height / 2 + 370, 270, 85, 0x282828, '#ffffff', 'Menu', () => {

    // Remove end game UI
    endGameUI.forEach(obj => obj.destroy());
    endGameUI = [];
    deathLineGraphics.setVisible(false);

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

endGameUI.push(menuButton.bg);
endGameUI.push(menuButton.label);
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

    quitButton.bg.setVisible(true);
    quitButton.label.setVisible(true);

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
    scoreText.setVisible(false);

    // Create a dark overlay
    overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55)
        .setOrigin(0, 0)
        .setDepth(0);
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, config.height / 2 - 280, 'Merge Game', {
        fontSize: '76px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5);
    menuUI.push(title);

    // Check if username is already saved
    let playerName = localStorage.getItem("playerName");

    if (!playerName) {
        const nameLabel = scene.add.text(config.width / 2, config.height / 2 - 60, 'Enter your name:', {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        menuUI.push(nameLabel);

        // Create a DOM input box
        const nameInput = scene.add.dom(config.width / 2, config.height / 2, 'input', {
            type: 'text',
            fontSize: '38px',
            padding: '5px',
            width: '400px',
            maxlength: 16,
            minlength: 2,
            pattern: "[A-Za-z0-9\-_!?ÆØÅæøåÖöÄä]+"
        });
        menuUI.push(nameInput);

        const saveButton = createButton(scene, config.width / 2, config.height / 2 + 100, 400, 90, 0x4CAF50, '#ffffff', 'Save Name', () => {

            let enteredName = nameInput.node.value.trim();
            if (enteredName.length < 3 || enteredName.length > 16) {
                alert("Name must be between 3 and 16 characters!")
                return;
            }
            if (!/^[A-Za-z0-9\-_!?ÆØÅæøåÖöÄä]+$/.test(enteredName)) {
                alert("Name can only contain letters and numbers!");
                return;
            }
                // Save name
                localStorage.setItem("playerName", enteredName);

                // Clear menu and reload it
                menuUI.forEach(obj => obj.destroy());
                menuUI = [];
                showMenu(scene);
        });

        menuUI.push(saveButton.bg);
        menuUI.push(saveButton.label);

    } else {

    // Play button
    const playButton = createButton(scene, config.width / 2, config.height / 2 + 120, 270, 90, 0x4CAF50, '#ffffff', 'Play', () => {
        // remove menu UI
        menuUI.forEach(obj => obj.destroy());
        menuUI = [];

        startGame(scene);
    }
);

menuUI.push(playButton.bg);
menuUI.push(playButton.label);

    const leaderboardButton = createButton(scene, config.width / 2, config.height / 2 + 320, 370, 90, 0x27A3F5, '#ffffff', 'Leaderboard', async () => {

    // remove menu UI
    menuUI.forEach(obj => obj.destroy());
    menuUI = [];

    // show leaderboard
    await showLeaderboard(scene);
    }
);

menuUI.push(leaderboardButton.bg);
menuUI.push(leaderboardButton.label);

    }
}

function startGame(scene) {
    gameOver = false;
    deathLineGraphics.setVisible(true);
    scoreText.setVisible(true);

    // Reset score and fruits
    score = 0;
    scoreText.setText('Score: 0');
    fruits.forEach(f => f.destroy());
    fruits = [];

    // Spawn first fruit
    if (!gameOver) {
        spawnFruit(scene);
    }

    ignoreNextPress = false;
    gameStarted = true;

    // Quit button -> quits the current game and goes back to menu
    quitButton = createButton(scene, 45, 40, 75, 60, 0x303030, '#ffffff', 'Quit', () => {

        scene.tweens.killAll();
        scene.time.clearPendingEvents();
        deathLineGraphics.setVisible(false);

        // Remove all fruits
        fruits.forEach(f => f.destroy());
        fruits = [];

        // Destroy current fruit if exists
        if (currentFruit) {
            currentFruit.destroy();
            currentFruit = null;
        }

        const playerName = localStorage.getItem('playerName');
        if(score >= 1500 && playerName) {
            submitScore(scene, playerName, score);
        }

        // Remove end game UI if any
        endGameUI.forEach(obj => obj.destroy());
        endGameUI = [];

        // Go back to menu
        showMenu(scene);

        gameOver = true;
        gameStarted = false;
        
        quitButton.bg.destroy();
        quitButton.label.destroy();
    });
    
}

async function submitScore(scene, playerName, score) {
    try {
        const response = await fetch("https://merge-game.onrender.com/submit-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_name: playerName, score })
        });
        const data = await response.json();
        console.log("Score submitted:", data);

        const leaderBoardResponse = await fetch("https://merge-game.onrender.com/leaderboard");
        const top10 = await leaderBoardResponse.json();

        // Send notification if score was higher than 10th place on leaderboard
        const minTopScore = Math.min(...top10.map(entry => entry.score));
        if (score > minTopScore) {
            showLeaderboardNotification(scene, score);
        }
    } catch (err) {
        console.error("Failed to submit score:", err);
    }
}

async function showLeaderboard(scene) {

    deathLineGraphics.setVisible(false);

    // Create a semi-transparent overlay
    const overlay = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.9)
        .setOrigin(0, 0);
    
    menuUI.push(overlay);

    const title = scene.add.text(config.width / 2, 100, 'Leaderboard', {
        fontSize: '56px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);
    menuUI.push(title);

    try {
        const response = await fetch('https://merge-game.onrender.com/leaderboard');
        const data = await response.json(); // expect an array of { username, score }
        
        // Show top 10 scores
        data.slice(0, 10).forEach((entry, index) => {
            const text = scene.add.text(config.width / 2, 260 + index * 60, `${index+1}. ${entry.player_name}: ${entry.score}`, {
                fontSize: '44px',
                fontFamily: 'Arial',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            menuUI.push(text);
        });

    } catch (err) {
        console.error('Failed to load leaderboard:', err);
    }

    // Back button to return to menu
    const backButton = createButton(scene, config.width / 2, config.height - 70, 260, 85, 0x4CAF50, '#ffffff', 'Back', () => {

        menuUI.forEach(obj => obj.destroy());
        menuUI = [];
        showMenu(scene);
    });

    menuUI.push(backButton.bg);
    menuUI.push(backButton.label);
}

function playMergeAnimation(scene, fruit) {
    if (!fruit || !fruit.body) return;

    fruit.setScale(0.5);
    scene.tweens.add({
        targets: fruit,
        scale: 1,
        duration: 150,
        ease: "Back.Out",
        onComplete: () => {
            if (fruit && fruit.setScale) {
                fruit.setScale(1);
            }
        }
    });
}

// Show a small "Score in top 10!" notification
function showLeaderboardNotification(scene, score) {
    const notif = scene.add.text(config.width - 100, config.height - 100, `${score} is in top 10, Saved to leaderboard!`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#eeff00ff',
        align: 'right'
    }).setOrigin(1, 1);

    // Tween to fade out after 6 seconds
    scene.tweens.add({
        targets: notif,
        alpha: 1,
        duration: 5300,
        ease: 'Power2',
        onComplete: () => notif.destroy()
    });
}

function createButton(scene, x, y, width, height, bgColor = 0x4CAF50, textColor = '#ffffff', text, callback) {
    // Button background
    const bg = scene.add.rectangle(x, y, width, height, bgColor, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.2) // subtle border
        .setInteractive({ useHandCursor: false })
        .setDepth(1001)

    // Button label
    const label = scene.add.text(x, y, text, {
        fontSize: `${Math.floor(height / 2.5)}px`,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: textColor,
        stroke: '#070707',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(1002);

    // Hover effect
    bg.on('pointerover', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1.05, duration: 150, ease: 'Power1' });
    });

    // Pointer out
    bg.on('pointerout', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1, duration: 150, ease: 'Power1' });
    });

    // Press down
    bg.on('pointerdown', () => {
        scene.tweens.add({ targets: [bg, label], scale: 0.95, duration: 100, ease: 'Power1' });
    });

    // Release
    bg.on('pointerup', () => {
        scene.tweens.add({ targets: [bg, label], scale: 1.05, duration: 150, ease: 'Power1' });
        callback();
    });

    return { bg, label };
}
