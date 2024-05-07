class Scene extends PIXI.Container {
    constructor(app, width, height) {
        super();
        this.app = app;
        this.width = width;
        this.height = height;
        this.objects = [];
        this.spriteMap = new Map();
        this.background = null;
        this.isVisible = false;
        this.cachedData = null;
    }
    hide() {
        this.isVisible = false;
        this.visible = false;
    }

    show() {
        this.isVisible = true;
        this.visible = true;
        this.app.stage.addChild(this);
    }

    addButton(x, y, width, height, color, text, onClick) {
        const button = new PIXIButton(x, y, width, height, color, text, onClick);
        this.addChild(button);
        const buttonId = `button_${Date.now()}`;
        this.spriteMap.set(buttonId, button);
        return buttonId;
    }

    addSprite(spriteObj) {
        const { imageSrc, spriteWidth, spriteHeight, spriteX, spriteY, characterKey } = spriteObj;
        const texture = PIXI.Texture.from(imageSrc);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = spriteX;
        sprite.y = spriteY;
        sprite.width = spriteWidth;
        sprite.height = spriteHeight;
        this.addChild(sprite);
        this.objects.push(sprite);
        this.spriteMap.set(characterKey, sprite);
        return sprite;
    }

    async loadAnimationData(animationKey) {
        try {
            const response = await fetch(`/asset-data/?assets=${animationKey}`);
            const animationData = await response.json();
            return animationData;
        } catch (error) {
            console.error('Error loading animation data:', error);
        }
    }

    loadAnimationToSprite(characterKey, imageQueue, frameDuration, loopFlag) {
        const sprite = this.spriteMap.get(characterKey);

        // Stop any existing animation
        if (sprite.animationTimeout) {
            clearTimeout(sprite.animationTimeout);
            sprite.texture = sprite.originalTexture; // Reset the texture to the original
        }

        sprite.originalTexture = sprite.texture; // Store the original texture

        let currentFrame = 0;

        const animateNextFrame = () => {
            if (currentFrame < imageQueue.length) {
                const imageSrc = imageQueue[currentFrame];
                const texture = PIXI.Texture.from(imageSrc);
                sprite.texture = texture;
                currentFrame++;
                sprite.animationTimeout = setTimeout(animateNextFrame, frameDuration);
            } else {
                // Reset to the first frame
                currentFrame = 0;

                // If loopFlag is false, stop the animation
                if (loopFlag) {
                    // Loop animation
                    sprite.animationTimeout = setTimeout(animateNextFrame, frameDuration);
                } else {
                    // Stop animation and reset to the original texture
                    clearTimeout(sprite.animationTimeout);
                    sprite.texture = sprite.originalTexture;
                }
            }
        };

        // Start animating
        animateNextFrame();
    }

    loadAnimationToSpriteInternal(sprite, imageQueue, frameDuration, loopFlag) {
        // Stop any existing animation
        if (sprite.animationTimeout) {
            clearTimeout(sprite.animationTimeout);
            sprite.texture = sprite.originalTexture; // Reset the texture to the original
        }

        let currentFrame = 0;
        sprite.originalTexture = sprite.texture; // Store the original texture

        const animateNextFrame = () => {
            if (currentFrame < imageQueue.length) {
                const imageSrc = imageQueue[currentFrame];
                const texture = PIXI.Texture.from(imageSrc);
                sprite.texture = texture;
                currentFrame++;
                sprite.animationTimeout = setTimeout(animateNextFrame, frameDuration);
            } else {
                // Reset to the first frame
                currentFrame = 0;

                // If loopFlag is false, stop the animation
                if (loopFlag) {
                    // Loop animation
                    sprite.animationTimeout = setTimeout(animateNextFrame, frameDuration);
                } else {
                    // Stop animation and reset to the original texture
                    clearTimeout(sprite.animationTimeout);
                    sprite.texture = sprite.originalTexture;
                }
            }
        };

        // Start animating
        animateNextFrame();
    }

    setBackground(backgroundObj) {
        const texture = PIXI.Texture.from(backgroundObj.imageSrc);

        // Check if the texture is already loaded
        if (texture.baseTexture.valid) {
            this.createBackgroundSprite(texture);
        } else {
            // If not loaded, listen for the 'update' event
            texture.baseTexture.on('update', () => {
                this.createBackgroundSprite(texture);
            });
        }
    }

    createBackgroundSprite(texture) {
        if (this.background) {
            this.removeChild(this.background);
        }

        this.background = new PIXI.Sprite(texture);
        this.background.width = 1280;
        this.background.height = 720;
        this.background.x = -30;
        this.background.y = 0;
        this.addChildAt(this.background, 0);
    }

    addObject(x, y, width, height, color, objectIndex = null) {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawRect(x, y, width, height);
        graphics.endFill();
        this.addChild(graphics);
        const rectId = `rectangle_${Date.now()}`;
        this.spriteMap.set(rectId, graphics);
        return rectId;
    }

    removeObject(index) {
        if (index >= 0 && index < this.objects.length) {
            this.removeChild(this.objects[index]);
            this.objects.splice(index, 1);
        }
    }

    removeSprite(imageSrc) {
        const sprite = this.spriteMap.get(imageSrc);
        if (sprite) {
            this.removeChild(sprite);
            this.spriteMap.delete(imageSrc);
        }
    }
    async loadCharacterData(characterKey) {
        try {
            const response = await fetch(`/character/${characterKey}`);
            const spriteObj = await response.json();
            this.addSprite(
                new SpriteObj(
                    spriteObj.imageSrc,
                    spriteObj.spriteWidth,
                    spriteObj.spriteHeight,
                    spriteObj.spriteX,
                    spriteObj.spriteY,
                    characterKey
                )
            );
            return spriteObj;
        } catch (error) {
            console.error('Error loading character data:', error);
        }
    }
}