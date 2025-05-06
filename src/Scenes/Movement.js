class Movement extends Phaser.Scene {
    constructor() {
        super("movement");
        this.my = { sprite: {}, bullets: [], bPlanes: [], eBullets: [], health: []};

        this.bodyX = 400;
        this.bodyY = 550;
        this.score = 0;
        this.gameOver = false;
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("red", "ship_0009.png");
        this.load.image("blue", "ship_0000.png");
        this.load.image("green", "ship_0006.png");
        this.load.image("bullet", "tile_0018.png");
        this.load.image("blaster", "tile_0012.png");
        this.load.image("health", "tile_0024.png");
        this.load.audio("laser", "laser4.ogg");
        this.load.audio("boom", "impactPunch_heavy_000.ogg");
    }

    create() {
        let my = this.my;
    
        // Reset state
        this.gameOver = false;
        this.score = 0;
        this.scoreText?.destroy(); // Remove old text if restarting
    
        // Destroy all previous game objects
        for (let group of [my.bullets, my.bPlanes, my.eBullets, my.health, my.greenPlanes || []]) {
            for (let obj of group) {
                obj.destroy();
            }
        }
    
        // Clear arrays
        my.bullets = [];
        my.bPlanes = [];
        my.eBullets = [];
        my.health = [];
        my.greenPlanes = [];
    
        // Destroy and remove end screen if still present
        this.endOverlay?.destroy();
        this.endText?.destroy();
        this.scoreSummary?.destroy();
        this.retryPrompt?.destroy();
    
        // Reset wave
        this.currentWave = 0;
        this.maxWaves = 5;
        this.enemiesLeft = 0;
    
        // Set up keys
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.retryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.laserS = this.sound.add("laser");
        this.boomS = this.sound.add("boom");

    
        // Player
        my.sprite.player = this.add.sprite(this.bodyX, this.bodyY, "red");
    
        // Health
        for (let i = 0; i < 3; i++) {
            let hp = this.add.sprite(30 + i * 50, 30, "health");
            hp.setScale(3);
            my.health.push(hp);
        }
    
        // Score
        this.scoreText = this.add.text(600, 10, "Score: 0", {
            fontSize: "28px",
            fill: "#FF0000"
        });
    
        // Start wave
        this.startNextWave();
    }    

    update() {
        let my = this.my;

        // Allow retrying after game over
        if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.retryKey)) {
            this.scene.restart();
            return;
        }

        // Stop gameplay logic if game is over
        if (this.gameOver) return;

        // Player movement
        if (this.keyD.isDown && my.sprite.player.x < 780) {
            my.sprite.player.x += 10;
        }
        if (this.keyA.isDown && my.sprite.player.x > 20) {
            my.sprite.player.x -= 10;
        }

        // Player shooting
        if (Phaser.Input.Keyboard.JustDown(this.spaceBar)) {
            let bullet = this.add.sprite(my.sprite.player.x, my.sprite.player.y - 10, "blaster");
            my.bullets.push(bullet);
            this.laserS.play();
        }

        // Player bullet movement and collisions
        for (let i = my.bullets.length - 1; i >= 0; i--) {
            let bullet = my.bullets[i];
            bullet.y -= 15;

            if (bullet.y < -20) {
                bullet.destroy();
                my.bullets.splice(i, 1);
                continue;
            }

            for (let j = my.bPlanes.length - 1; j >= 0; j--) {
                let bluePlane = my.bPlanes[j];
                if (this.collides(bluePlane, bullet)) {
                    bluePlane.destroy();
                    my.bPlanes.splice(j, 1);
                    bullet.destroy();
                    my.bullets.splice(i, 1);
                    this.boomS.play();
                    this.score += 100;
                    this.scoreText.setText("Score: " + this.score);
                    this.enemiesLeft--;
                    if (this.enemiesLeft <= 0) {
                        this.time.delayedCall(1000, () => this.startNextWave());
                    }
                    break;
                }
            }
        }

        // Blue plane movement
        for (let i = my.bPlanes.length - 1; i >= 0; i--) {
            let bluePlane = my.bPlanes[i];
            bluePlane.y += 6;

            if (bluePlane.y > 620) {
                bluePlane.destroy();
                my.bPlanes.splice(i, 1);
                this.enemiesLeft--;
                if (this.enemiesLeft === 0 && this.currentWave < this.maxWaves) {
                    this.startNextWave();
                }
            }
        }

        // Enemy bullet movement and collisions
        for (let i = my.eBullets.length - 1; i >= 0; i--) {
            let eBullet = my.eBullets[i];
            eBullet.x += eBullet.velocity?.x || 0;
            eBullet.y += eBullet.velocity?.y || 10;

            if (eBullet.y > 620 || eBullet.y < -20 || eBullet.x < -20 || eBullet.x > 820) {
                eBullet.destroy();
                my.eBullets.splice(i, 1);
                continue;
            }

            if (this.collides(my.sprite.player, eBullet)) {
                if (my.health.length > 0) {
                    let lostHP = my.health.pop();
                    lostHP.destroy();
                }
                if (my.health.length === 0) {
                    this.showEndScreen(false);
                }
                eBullet.destroy();
                my.eBullets.splice(i, 1);
            }
        }

        // Bullet collision with green planes
        for (let i = my.bullets.length - 1; i >= 0; i--) {
            let bullet = my.bullets[i];
            for (let j = (my.greenPlanes || []).length - 1; j >= 0; j--) {
                let greenPlane = my.greenPlanes[j];
                if (this.collides(greenPlane, bullet)) {
                    greenPlane.destroy();
                    my.greenPlanes.splice(j, 1);
                    bullet.destroy();
                    my.bullets.splice(i, 1);
                    this.boomS.play();
                    this.score += 50;
                    this.scoreText.setText("Score: " + this.score);
                    this.enemiesLeft--;
                    if (this.enemiesLeft <= 0) {
                        this.time.delayedCall(1000, () => this.startNextWave());
                    }
                    break;
                }
            }
        }
    }

    collides(a, b) {
        if (Math.abs(a.x - b.x) > (a.displayWidth / 2 + b.displayWidth / 2)) return false;
        if (Math.abs(a.y - b.y) > (a.displayHeight / 2 + b.displayHeight / 2)) return false;
        return true;
    }

    showEndScreen(won) {
        this.gameOver = true;
        const message = won ? "YOU WIN!" : "GAME OVER";
    
        this.endOverlay = this.add.rectangle(400, 300, 600, 400, 0x000000, 0.7).setDepth(10);
        this.endText = this.add.text(300, 200, message, { fontSize: "40px", fill: "#FFFFFF" }).setDepth(11);
        this.scoreSummary = this.add.text(300, 260, "Final Score: " + this.score, { fontSize: "28px", fill: "#FFAA00" }).setDepth(11);
        this.retryPrompt = this.add.text(270, 330, "Press R to Retry", {
            fontSize: "32px",
            fill: "#00FF00"
        }).setDepth(11);
    }    

    spawnGreenPlane(startX, startY) {
        if (this.gameOver) return;

        let path = new Phaser.Curves.Path(startX, startY);
        path.lineTo(startX + 300, startY + 600);

        let greenPlane = this.add.follower(path, startX, startY, "green");
        greenPlane.setScale(1.2);
        greenPlane.startFollow({
            duration: 5000,
            onUpdate: () => {
                let angle = Phaser.Math.Angle.Between(
                    greenPlane.x, greenPlane.y,
                    greenPlane.prevX || greenPlane.x, greenPlane.prevY || greenPlane.y
                );
                greenPlane.rotation = angle + Math.PI / 2;
                greenPlane.prevX = greenPlane.x;
                greenPlane.prevY = greenPlane.y;
            },
            onComplete: () => {
                greenPlane.destroy();
                this.enemiesLeft--;
                if (this.enemiesLeft === 0 && this.currentWave < this.maxWaves) {
                    this.startNextWave();
                }
            }
        });

        this.my.greenPlanes = this.my.greenPlanes || [];
        this.my.greenPlanes.push(greenPlane);

        // Fire at player every 1.7 seconds
        greenPlane.fireTimer = this.time.addEvent({
            delay: 1700,
            callback: () => {
                if (this.gameOver || !greenPlane.active || !this.my.sprite.player.active) return;

                let eBullet = this.add.sprite(greenPlane.x, greenPlane.y, "bullet");
                this.my.eBullets.push(eBullet);

                let dx = this.my.sprite.player.x - greenPlane.x;
                let dy = this.my.sprite.player.y - greenPlane.y;
                let angle = Math.atan2(dy, dx);
                eBullet.rotation = angle + Math.PI / 2;

                eBullet.speed = 10;
                eBullet.velocity = { x: Math.cos(angle) * eBullet.speed, y: Math.sin(angle) * eBullet.speed };
            },
            callbackScope: this,
            loop: true
        });

        greenPlane.on('destroy', () => {
            greenPlane.fireTimer.remove();
        });
    }

    startNextWave() {
        if (this.currentWave >= this.maxWaves || this.gameOver) {
            this.showEndScreen(true);
            return;
        }

        this.currentWave++;
        let blueCount = this.currentWave * 2;
        let greenCount = this.currentWave;

        // Spawn blue planes
        for (let i = 0; i < blueCount; i++) {
            this.time.delayedCall(i * 500, () => {
                if (this.gameOver) return;

                let bluePlane = this.add.sprite(Phaser.Math.Between(50, 750), 0, "blue");
                this.my.bPlanes.push(bluePlane);
                this.enemiesLeft++;

                bluePlane.fireTimer = this.time.addEvent({
                    delay: 1500,
                    callback: () => {
                        if (this.gameOver || !bluePlane.active) return;
                        let eBullet = this.add.sprite(bluePlane.x, bluePlane.y + 10, "bullet");
                        this.my.eBullets.push(eBullet);
                    },
                    loop: true
                });

                bluePlane.on('destroy', () => {
                    bluePlane.fireTimer?.remove();
                });
            });
        }

        // Spawn green planes
        for (let i = 0; i < greenCount; i++) {
            this.time.delayedCall(i * 800, () => {
                if (this.gameOver) return;
                let x = Phaser.Math.Between(100, 700);
                this.spawnGreenPlane(x, -50);
                this.enemiesLeft++;
            });
        }
    }
}
