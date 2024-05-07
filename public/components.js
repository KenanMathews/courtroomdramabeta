class SpriteObj {
    constructor(imageSrc, spriteWidth, spriteHeight, spriteX, spriteY, characterKey) {
        this.imageSrc = imageSrc;
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.spriteX = spriteX;
        this.spriteY = spriteY;
        this.characterKey = characterKey;
    }
}

// Define your text box class
class TextBox extends PIXI.Container {
    constructor(x, y, width, text, fontSize, fontFamily, textColor, boxColor) {
        super();
        this.x = x;
        this.y = y;

        this.box = new PIXI.Graphics();
        this.box.beginFill(boxColor);
        this.box.drawRect(0, 0, width, fontSize + 20);
        this.box.endFill();
        this.addChild(this.box);

        this.textElement = new PIXI.Text(text, {
            fontFamily: fontFamily,
            fontSize: fontSize,
            fill: textColor,
            wordWrap: true,
            wordWrapWidth: width - 20,
        });
        this.textElement.x = 10;
        this.textElement.y = 10;
        this.addChild(this.textElement);
    }
}

// Define your button class
class PIXIButton extends PIXI.Container {
    constructor(x, y, width, height, color, text, onClick) {
        super();
        this.x = x;
        this.y = y;

        this.button = new PIXI.Graphics();
        this.button.beginFill(color);
        this.button.drawRect(0, 0, width, height);
        this.button.endFill();
        this.addChild(this.button);

        this.text = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 'black',
            align: 'center',
        });
        this.text.x = width / 2;
        this.text.y = height / 2;
        this.text.anchor.set(0.5);
        this.addChild(this.text);

        this.interactive = true;
        this.on('click', onClick);
    }
}
