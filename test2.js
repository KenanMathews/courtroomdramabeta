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

// Define your scene class
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

// Define your scene manager class
class SceneManager {
    constructor() {
        this.app = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight });
        document.getElementById('game-container').appendChild(this.app.view);
        this.scenes = new Map();
        this.currentScene = null;
        this.sceneNames = [];
        this.currentIndex = 0;
        this.intervalId = null;
        this.ws = new WebSocket('ws://kenan-6850.csez.zohocorpin.com:8001'); // Connect to the WebSocket server
        this.setupWebSocketHandlers();
        this.roomName = null;
        this.roomInfo = {};
        this.userId = null;
        // Audio players setup
        this.audioPlayer = this.createAudioElement('musicplayer', true);
        this.effectPlayer = this.createAudioElement('effectplayer', true);
        this.objectionData = null;
        this.audioSrc = null;
        this.effectSrc = null;
        this.musicPaused = false;

        this.effectPlayer.addEventListener('ended', () => {         // Add event listener to effect player to resume music after it ends
            if (this.musicPaused) {
                // If music was paused, resume it
                this.audioPlayer.play();
                this.musicPaused = false;
            }
        });

    }
    createAudioElement(id, autoplay) {
        const audioPlayer = document.createElement('audio');
        audioPlayer.id = id;
        audioPlayer.autoplay = autoplay;
        audioPlayer.volume = 0.3;
        document.body.appendChild(audioPlayer);
        return audioPlayer;
    }
    requestAudio(audioUrl, id) {
        // Check if the requested audio source is already loaded
        if ((id === "musicplayer" && this.audioSrc === audioUrl) || (id === "effectplayer" && this.effectSrc === audioUrl)) {
            return;
        }

        // Fetch the audio file from the server
        fetch(audioUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // Convert the response blob into a URL
                return response.blob();
            })
            .then(blob => {
                const audioUrl = URL.createObjectURL(blob);
                // Load the audio
                this.loadAudio(audioUrl, id);
                // Update the loaded audio source
                if (id === "musicplayer") {
                    this.audioSrc = audioUrl;
                } else {
                    this.effectSrc = audioUrl;
                    // Pause music if effect player is played
                    if (!this.musicPaused) {
                        this.audioPlayer.pause();
                        this.musicPaused = true;
                    }
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }
    loadAudio(audioUrl, id) {
        var audio = document.getElementById(id);
        audio.src = audioUrl;
    }
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onmessage = (event) => {
            if (event.data) {
                const { type, data, roomInfo } = JSON.parse(event.data);
                switch (type) {
                    case 'updateScene':
                        this.handleUpdateScene(data);
                        break;
                    case 'roomCreated':
                        this.roomName = data;
                        this.updateSceneWithRoomInfo(roomInfo);
                        hideLoading();
                        console.log(`Room "${data}" created.`);
                        break;
                    case 'roomExists':
                        hideLoading();
                        alert("Room exists");
                        break;
                    case 'roomJoined':
                        this.roomName = data;
                        this.updateSceneWithRoomInfo(roomInfo);
                        this.loadPosesforChat(data);
                        hideLoading();
                        console.log(`Joined room "${data}".`);
                        break;
                    case 'error':
                        alert(data);
                        break;
                    case 'message':
                        console.log(`Received message: ${data}`);
                        break;
                    case 'requestTopic':
                        console.log("Topic requested");
                        openModal("Topic", "Enter topic to be discussed:", getTopic, this);
                        break;
                    case 'topicSet':
                        document.getElementById("game-topicName").textContent = `Topic:${data}`
                        console.log(`Topic set to: ${data}`);
                        break;
                    case 'modeSet':
                        console.log(`Mode set to: ${data}`);
                        break;
                    case 'sideSelected':
                        this.handleSideSelectedWS(data);
                        break;
                    case 'showChatBox':
                        this.updateSceneWithRoomInfo(roomInfo);
                        this.handleChatBox();
                    case 'chatMessage':
                        this.roomInfo = roomInfo;
                        this.handleChatBox();
                        break;
                    case 'updateUUID':
                        this.userId = data;
                        break;
                    case 'speakerSwitched':
                        this.updateSceneWithRoomInfo(roomInfo);
                        this.switchScene(data.side);
                        this.handleChatBox();
                        break;
                    case 'holditChatLog':
                        this.handleHolditChatLog(data);
                        break;
                    case 'holdItTriggered':
                        showSplashImage('assets/splash/holdit.png');
                        this.updateSceneWithRoomInfo(roomInfo);
                        this.handleHolditforUsers(data);
                        console.log('Holdit triggered');
                        break;
                    case 'objectionTriggered':
                        showSplashImage('assets/splash/objection.png');
                        this.updateSceneWithRoomInfo(roomInfo);
                        this.handleObjectionforUsers(data);
                        console.log('Holdit triggered');
                        break;
                    case 'waitingPlayer':
                        showLoading('Waiting for player...')
                        break;
                    case 'playerJoined':
                        hideLoading();
                        break;
                    case 'loadPose':
                        this.loadAnimations(data.side, data.characterKey, data.animation)
                        break;
                    default:
                        console.log('Unsupported WebSocket message type:', type);
                }
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    handleHolditChatLog(data) {
        this.objectionLog = data; // Property to store objection data
        const novelTextBox = document.getElementById('novelTextBox');
        const nextButton = document.getElementById('fwd-btn');
        const previousButton = document.getElementById('bck-btn');

        let currentIndex = 0;

        // Function to display the objection log message at the specified index
        function displayHolditLog(index) {
            const message = data[index];
            if (message) {
                document.getElementById('characterName').textContent = message.user;
                novelTextBox.setAttribute('message-id', message.id);
                novelTextBox.textContent = message.message;
            }
        }

        // Display the first objection log initially
        displayHolditLog(currentIndex);

        // Add event listener for cycling to the next objection log
        function nextStatement() {
            currentIndex = (currentIndex + 1) % data.length;
            displayHolditLog(currentIndex);
        }

        nextButton.addEventListener('click', nextStatement);

        // Add event listener for cycling to the previous objection log
        function previousStatement() {
            currentIndex = (currentIndex - 1 + data.length) % data.length;
            displayHolditLog(currentIndex);
        }

        previousButton.addEventListener('click', previousStatement);
    }
    removeObjectionEventListeners() {
        const nextButton = document.getElementById('fwd-btn');
        const previousButton = document.getElementById('bck-btn');
        nextButton.removeEventListener('click', nextStatement);
        previousButton.removeEventListener('click', previousStatement);
    }
    handleHolditforUsers() {
        const isSpeaker = this.roomInfo.users.find(user => user.userId === this.userId && user.isSpeaker);
        const oc = document.getElementById('objection-control');
        const chatModal = document.getElementById('chat-modal');
        const chatControls = document.getElementById('chat-controls');
        const chatInput = document.getElementById('chat-input');
        const holdItBtn = document.getElementById('holdItBtn');
        const objectionBtn = document.getElementById('objectionBtn');
        chatModal.classList.add('hidden');
        chatControls.classList.add('hidden');
        chatInput.classList.add('hidden');
        if (!isSpeaker) {
            oc.classList.remove('hidden');
            holdItBtn.classList.add('hidden');
            objectionBtn.classList.remove('hidden');
        }
    }
    handleObjectionforUsers(data) {
        showFullScreenAlert(data);
        const objectionBtn = document.getElementById('objectionBtn');
        const holdItBtn = document.getElementById('holdItBtn');
        const oc = document.getElementById('objection-control');
        if (!isSpeaker) {
            oc.classList.add('hidden');
            holdItBtn.classList.remove('hidden');
            objectionBtn.classList.add('hidden');
        }
        oc.classList.add('hidden');

    }
    handleSideSelectedWS(data) {
        const courtSideSelectionLayer = document.getElementById('courtSideSelectionLayer');
        courtSideSelectionLayer.classList.add("hidden");
        this.switchScene(data.side);
        this.loadPosesforChat(data.spriteKey);
    }
    updateSceneWithRoomInfo(roomInfo) {
        this.roomInfo = roomInfo;
        document.getElementById("game-topicName").textContent = this.roomInfo.topic ? `Topic:${this.roomInfo.topic}` : "";
        document.getElementById("game-roomName").textContent = this.roomInfo.name ? `Room:${this.roomInfo.name}` : "";
        if (this.roomInfo.speakerSide && this.roomInfo.speaker) {
            this.switchScene(this.roomInfo.speakerSide);
            document.getElementById('characterName').textContent = this.roomInfo.speaker;
        }
        if (this.roomInfo.audioUrl) {
            this.requestAudio(this.roomInfo.audioUrl, "musicplayer");
        }
        if (this.roomInfo.effectUrl) {
            this.requestAudio(this.roomInfo.effectUrl, "effectplayer");
        }
    }
    handleChatBox() {
        const isSpeaker = this.roomInfo.users.find(user => user.userId === this.userId && user.isSpeaker);
        // Update the UI to show the chat box
        const chatModal = document.getElementById('chat-modal');
        const chatControls = document.getElementById('chat-controls');
        const sendBtn = document.getElementById('send-btn');
        const popoverBtn = document.getElementById('popover-btn');
        const voiceBtn = document.getElementById('voice-btn');
        const stopBtn = document.getElementById('stop-btn');
        const chatInput = document.getElementById('chat-input');
        const objectionLayer = document.getElementById('objectionLayer');


        if (isSpeaker) {
            chatModal.classList.remove('hidden');
            chatControls.classList.remove('hidden');
            chatInput.classList.remove('hidden');
            objectionLayer.classList.add('hidden');

        } else {
            chatModal.classList.add('hidden');
            chatControls.classList.add('hidden');
            chatInput.classList.add('hidden');
            objectionLayer.classList.remove('hidden');


        }
        // Add chat message event listeners if not already added
        if (!this.chatEventListenersAdded) {

            chatInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    sendBtn.click();
                }
            });

            stopBtn.addEventListener('click', () => {
                this.ws.send(JSON.stringify({ type: 'switchSpeaker' }));
            });

            voiceBtn.addEventListener('click', () => {
                voiceBtn.classList.add("hidden");
                const recognition = new webkitSpeechRecognition();

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    console.log('Transcript:', transcript);

                    // Create an audio object
                    const audioBlob = new Blob([transcript], { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);

                    // Attach the audio object to the chat input
                    chatInput.audio = audioBlob;
                    chatInput.value = 'Voice message';

                    voiceBtn.classList.remove("hidden");
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                };

                recognition.start();
            });

            sendBtn.addEventListener('click', () => {
                const message = chatInput.value.trim();
                let data;
                if (message) {
                    // Check if chat input contains audio
                    if (chatInput.audio) {
                        data = { type: 'audioMessage', audio: chatInput.audio, message: message, roomName: this.roomName };
                    } else {
                        data = { type: 'chatMessage', data: message, roomName: this.roomName };
                    }
                    this.ws.send(JSON.stringify(data));
                    chatInput.value = '';
                    chatInput.audio = null; // Reset audio object
                }
            });

            popoverBtn.addEventListener('click', () => {
                document.getElementById('popover').classList.toggle('hidden');
            });
            // Set the flag to indicate that event listeners have been added
            this.chatEventListenersAdded = true;
        }

        // Update the chat log
        this.updateChatLog();
    }
    updateChatLog() {
        const chatMessages = this.roomInfo.chatInfo.chatLog
        const chatLog = document.getElementById('chat-log');
        chatLog.innerHTML = '';

        chatMessages.forEach((entry) => {
            const chatEntry = document.createElement('div');
            chatEntry.classList.add('mb-2');
            chatEntry.innerHTML = `${entry.user} <span class="text-xs">[${new Date(entry.timestamp).toLocaleString()}]</span><br> ${entry.message}`;
            chatLog.appendChild(chatEntry);
        });

        chatLog.scrollTop = chatLog.scrollHeight;

        document.getElementById('text-bar').classList.remove('hidden');
        // Load the last chat message
        const lastMessage = chatMessages[chatMessages.length - 1];

        // Buffer the last message
        if (lastMessage) {
            bufferMessage(lastMessage);
        }
    }

    async handleUpdateScene(sceneData) {
        const { name, backgroundPath, spritesData, objectsData } = sceneData;

        // Update the existing scene with the new data
        const scene = this.scenes.get(name);
        if (scene) {
            // Update the background
            scene.setBackground({ imageSrc: backgroundPath });

            // Update the sprites and animations
            await this.updateSceneSprites(scene, spritesData);

            // Update other objects
            await this.updateSceneObjects(scene, objectsData);

            // Show the updated scene
            this.switchScene(name);
        } else {
            console.error(`Scene "${name}" not found in the scenes map.`);
        }
    }
    async updateSceneObjects(scene, objectsData) {
        for (const { key, info } of objectsData) {
            try {
                switch (info.type) {
                    case 'sprite':
                        // Stop any existing animation on the sprite
                        const sprite = scene.spriteMap.get(info.index);
                        if (sprite && sprite.animationTimeout) {
                            clearTimeout(sprite.animationTimeout);
                            sprite.texture = sprite.originalTexture; // Reset the texture to the original
                        }

                        // Load the sprite based on the provided index
                        scene.addSprite(new SpriteObj(
                            info.imageSrc,
                            info.spriteWidth,
                            info.spriteHeight,
                            info.spriteX,
                            info.spriteY,
                            key
                        ));
                        break;
                    case 'background':
                        // Stop any existing animation on the background
                        if (scene.background && scene.background.animationTimeout) {
                            clearTimeout(scene.background.animationTimeout);
                            scene.background.texture = scene.background.originalTexture; // Reset the texture to the original
                        }

                        // Load the background using the provided index
                        await scene.setBackground({ imageSrc: info.imageSrc }, info.index);
                        break;
                    case 'rectangle':
                        // Load the rectangle using the provided index
                        scene.addObject(info.x, info.y, info.width, info.height, info.color, info.index);
                        break;
                    default:
                        console.warn(`Unsupported object type: ${info.type}`);
                }
            } catch (error) {
                console.error(`Error loading ${info.type} object:`, error);
            }
        }
    }

    async updateSceneSprites(scene, spritesData) {
        const characterKeys = spritesData.map(sprite => `character-${sprite.characterKey}`);
        const animationKeys = spritesData.map(sprite => {
            if (sprite.animationKey) {
                return `animation-${sprite.animationKey}`;
            } else {
                return null;
            }
        });
        scene.assets = await this.loadAssets([...characterKeys, ...animationKeys]);

        return Promise.all(spritesData.map(async (spriteObj) => {
            const characterData = scene.assets[`character-${spriteObj.characterKey}`];
            const sprite = scene.addSprite(
                new SpriteObj(
                    characterData.imageSrc,
                    characterData.spriteWidth,
                    characterData.spriteHeight,
                    characterData.spriteX,
                    characterData.spriteY,
                    spriteObj.characterKey
                ),
            );
            sprite.initialX = characterData.spriteX;
            sprite.initialY = characterData.spriteY;
            sprite.initialWidth = characterData.spriteWidth;
            sprite.initialHeight = characterData.spriteHeight;

            // Stop any existing animation on the sprite
            if (sprite.animationTimeout) {
                clearTimeout(sprite.animationTimeout);
                sprite.texture = sprite.originalTexture; // Reset the texture to the original
            }

            // Load the animation if it exists
            if (spriteObj.animationKey) {
                const animationData = scene.assets[`animation-${spriteObj.animationKey}`];
                if (animationData) {
                    await scene.loadAnimationToSprite(spriteObj.characterKey, animationData.imageQueue, animationData.frameDuration);
                }
            } else {
                // Switch back to the character key
                scene.loadCharacterData(spriteObj.characterKey);
            }
        }));
    }

    async loadAssets(assetKeys) {
        try {
            const response = await fetch(`/asset-data?assets=${assetKeys.join(',')}`);
            const assets = await response.json();
            return assets;
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }
    async loadScene(sceneName, scenePath, spritesData, objectsData) {
        const scene = new Scene(this.app, 1280, 720);

        try {
            // Load background
            await scene.setBackground({ imageSrc: scenePath });

            // Load sprites and animations
            const characterKeys = spritesData.map(sprite => `character-${sprite.characterKey}`);
            const animationKeys = spritesData.map(sprite => {
                if (sprite.animationKey) {
                    return `animation-${sprite.animationKey}`;
                } else {
                    // Handle cases where animationKey might be missing (optional)
                    return null; // Or some default value
                }
            });
            scene.assets = await this.loadAssets([...characterKeys, ...animationKeys]);
            //const cacheKey = `scene-${sceneName}`;
            //const cachedData = localStorage.getItem(cacheKey);
            //if (cachedData) {
            //    const parsedData = JSON.parse(cachedData);
            //    scene.assets = parsedData;
            //} else {
            //    scene.assets = await this.loadAssets([...characterKeys, ...animationKeys]);
            //    localStorage.setItem(cacheKey, JSON.stringify(scene.assets));
            //}

            for (const spriteObj of spritesData) {
                const characterData = scene.assets[`character-${spriteObj.characterKey}`];
                scene.addSprite(
                    new SpriteObj(
                        characterData.imageSrc,
                        characterData.spriteWidth,
                        characterData.spriteHeight,
                        characterData.spriteX,
                        characterData.spriteY,
                        spriteObj.characterKey
                    )
                );

                const animationData = scene.assets[`animation-${spriteObj.animationKey}`];
                if (animationData) {
                    await scene.loadAnimationToSprite(spriteObj.characterKey, animationData.imageQueue, animationData.frameDuration);
                }
            }

            // Load other objects
            await this.loadObjectsInScene(objectsData, scene);

            // Add the scene to the SceneManager
            this.scenes.set(sceneName, scene);

            return scene;
        } catch (error) {
            console.error('Error loading scene:', error);
        }
    }

    async loadObjectsInScene(data, scene) {
        for (const { key, info } of data) {
            try {
                switch (info.type) {
                    case 'sprite':
                        // Load sprite using the index
                        scene.addSprite(
                            new SpriteObj(
                                info.imageSrc,
                                info.spriteWidth,
                                info.spriteHeight,
                                info.spriteX,
                                info.spriteY,
                                key
                            )
                        );
                        break;
                    case 'background':
                        // Load background using the provided index
                        const backgroundIndex = info.index;
                        await scene.setBackground({ imageSrc: info.imageSrc }, backgroundIndex);
                        break;
                    case 'rectangle':
                        // Load rectangle using the provided index
                        const rectangleIndex = info.index;
                        scene.addObject(info.x, info.y, info.width, info.height, info.color, rectangleIndex);
                        break;
                    default:
                        console.warn(`Unsupported object type: ${info.type}`);
                }
            } catch (error) {
                console.error(`Error loading ${info.type} object:`, error);
            }
        }
    }

    async loadScenes() {
        try {
            // Fetch the scene information from the server
            const response = await fetch('/scenes');
            const scenesData = await response.json();

            // Loop through the scenes and load them
            for (const sceneData of scenesData) {
                const { name, backgroundPath, spritesData, objectsData } = sceneData;

                // Load the scene
                const scene = await this.loadScene(name, backgroundPath, spritesData, objectsData);

                // Add the scene to the SceneManager
                this.scenes.set(name, scene);
                this.sceneNames.push(name);
            }

            // Set the initial scene to the first one
            this.currentScene = this.scenes.get(this.sceneNames[0]);
            this.currentScene.show();

            // Start the interval timer for scene switching
            // this.startSceneSwitching();
            fetchCharacterData();
            this.loadRoomData();

        } catch (error) {
            console.error('Error loading scenes:', error);
        }
    }


    addTextBox(scene, x, y, width, text, fontSize, fontFamily, textColor, boxColor) {
        const textBox = new TextBox(x, y, width, text, fontSize, fontFamily, textColor, boxColor);
        scene.addChild(textBox);
    }

    addSwitchSceneButton(scene, text, targetSceneName, color) {
        scene.addButton(
            1280 / 2 - 150,
            720 / 2 - 50,
            300,
            100,
            color,
            text,
            () => {
                this.switchScene(targetSceneName);
            }
        );
    }

    startSceneSwitching() {
        // Check if there are scenes available
        if (this.sceneNames.length > 1) {
            // Start interval timer to switch scenes every 2 seconds
            this.intervalId = setInterval(() => {
                this.switchToNextScene();
            }, 2000);
        }
    }

    stopSceneSwitching() {
        // Clear the interval timer for scene switching
        clearInterval(this.intervalId);
    }

    switchToNextScene() {
        // Increment currentIndex to switch to the next scene
        this.currentIndex = (this.currentIndex + 1) % this.sceneNames.length;
        const nextSceneName = this.sceneNames[this.currentIndex];
        this.switchScene(nextSceneName);
    }

    switchScene(sceneName) {
        const newScene = this.scenes.get(sceneName);
        if (newScene) {
            console.log(`Switching to scene: ${sceneName}`);
            // Hide current scene
            if (this.currentScene) {
                this.currentScene.hide();
            }
            // Show new scene
            newScene.show();
            // Set the new scene as the current scene
            this.currentScene = newScene;
        } else {
            console.error(`Scene "${sceneName}" not found.`);
        }
    }
    loadEvents() {

        const createRoomBtn = document.getElementById('createRoomBtn');
        createRoomBtn.addEventListener('click', () => {
            if (document.querySelector('#usernameInput').value.trim() == '') {
                document.querySelector('#nonamealert').classList.remove('hidden');
                return;
            }
            openModal('Create Room', 'Enter room name:', createRoom, this);
        });

        // Join an existing room
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        joinRoomBtn.addEventListener('click', () => {
            if (document.querySelector('#usernameInput').value.trim() == '') {
                document.querySelector('#nonamealert').classList.remove('hidden');
                return;
            }
            openModal('Join Room', 'Enter room name:', joinRoom, this);
        });

        // Update textInputBtn to send mode 0
        const textInputBtn = document.getElementById('textInputBtn');
        textInputBtn.addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'setMode', data: 0, roomName: this.roomName })); // Send mode 0 for text input
            handleModeSelection('courtSideSelectionLayer');
        });

        // Update speechToTextBtn to send mode 1
        const speechToTextBtn = document.getElementById('speechToTextBtn');
        speechToTextBtn.addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'setMode', data: 1, roomName: this.roomName })); // Send mode 1 for speech to text
            handleModeSelection('courtSideSelectionLayer');

        });

        // Function to handle mode selection and layer visibility
        function handleModeSelection(selectedLayerId) {
            const textOrSpeechLayer = document.getElementById('textOrSpeechLayer');
            const courtSideSelectionLayer = document.getElementById(selectedLayerId);

            // Hide text or speech layer
            textOrSpeechLayer.classList.add('hidden');

            // Show court side selection layer
            courtSideSelectionLayer.classList.remove('hidden');

            // Remove event listeners from mode selection buttons
            textInputBtn.removeEventListener('click', handleModeSelection);
            speechToTextBtn.removeEventListener('click', handleModeSelection);
        }

        // Add event listeners for defence and prosecution buttons
        const defenceBtn = document.getElementById('defenceBtn');
        const prosecutionBtn = document.getElementById('prosecutionBtn');

        defenceBtn.addEventListener('click', () => {
            this.handleSideSelection(0);
        });

        prosecutionBtn.addEventListener('click', () => {
            this.handleSideSelection(1);
        });

        // Function to handle side selection and send WebSocket request

        const objectionBtn = document.getElementById('objectionBtn');
        objectionBtn.addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'objection', data: document.getElementById('novelTextBox').getAttribute("message-id") }));
        });

        const holdItBtn = document.getElementById('holdItBtn');
        holdItBtn.addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'holdIt', id: document.getElementById('novelTextBox').id }));
        });

        const crossExaminationBtn = document.getElementById('crossExaminationBtn');
        crossExaminationBtn.addEventListener('click', () => {
            this.ws.send(JSON.stringify({ type: 'crossExamination' }));
        });

        // Get the open chat button
        const openChatBtn = document.getElementById('open-chat-btn');
        const chatModal = document.getElementById('chat-modal');

        // Add a click event listener to the open chat button
        openChatBtn.addEventListener('click', () => {
            chatModal.classList.remove('hidden');
        });
    }
    handleSideSelection(selectedSide) {
        const side = selectedSide === 0 ? 'defence' : 'prosecution';
        const characterKey = selectedSide === 0 ? document.getElementById("defenceSelect").value : document.getElementById("prosecutionSelect").value;
        this.ws.send(JSON.stringify({ type: 'selectSide', data: { side: side, spriteKey: characterKey }, roomName: sceneManager.roomName }));
    }
    loadRoomData() {
        // const witnessMode = document.getElementById('witnessMode').checked;
        // const queryParams = new URLSearchParams({ witnessMode: witnessMode.toString() }).toString();
        fetch(`/get_open_rooms`)
            .then(response => response.json())
            .then(availableRooms => {
                this.populateRoomList(availableRooms);
            })
            .catch(error => console.error('Error:', error));
    }
    populateRoomList(availableRooms) {
        const roomList = document.getElementById("roomList");
        // Clear existing list items
        roomList.innerHTML = "";
        // Add list items for each available room
        availableRooms.forEach(room => {
            const listItem = document.createElement("li");
            listItem.textContent = room.name;
            listItem.classList.add("cursor-pointer", "hover:text-blue-500");
            listItem.addEventListener("click", () => {
                if (document.querySelector('#usernameInput').value.trim() == '') {
                    document.querySelector('#nonamealert').classList.remove('hidden');
                    return;
                }
                document.getElementById('roomManagementLayer').classList.add('hidden');
                showLoading('Joining room...');
                this.ws.send(JSON.stringify({ type: 'joinRoom', roomName: room.name, name: document.querySelector('#usernameInput').value.trim() }));
                console.log("Joining room:", room.name);
            });
            roomList.appendChild(listItem);
        });
        if (roomList.childNodes.length > 0) {
            document.getElementById("roomSelectionContainer").classList.remove("hidden");
        } else {
            document.getElementById("roomSelectionContainer").classList.add("hidden");
        }
    }
    async loadAnimations(sceneName, characterKey, animationKey) {
        try {
          const scene = this.scenes.get(sceneName);
          if (!scene) {
            console.error('Scene not found.');
            return;
          }
      
          const characterName = characterKey.substring("character-".length);
          const animationData = await scene.loadAnimationData(animationKey);
          const sprite = scene.spriteMap.get(characterName);
      
          // Stop any existing animation on the sprite
          if (sprite.animationTimeout) {
            clearTimeout(sprite.animationTimeout);
            sprite.texture = sprite.originalTexture; // Reset the texture to the original
          }
      
          // Load the new animation
          scene.loadAnimationToSpriteInternal(
            sprite,
            animationData[animationKey].imageQueue,
            animationData[animationKey].frameDuration,
            animationData[animationKey].loopFlag
          );
        } catch (error) {
          console.error('Error loading animations:', error);
        }
      }

    loadPosesforChat(characterKey) {
        fetch(`/asset-data?assets=${characterKey}`)
            .then(response => response.json())
            .then(data => {
                const characterData = data[characterKey]
                const characterAnimations = Object.values(characterData.animations).map(animation => `${animation}`);

                fetch(`/asset-data?assets=${characterAnimations.join(',')}`)
                    .then(response => response.json())
                    .then(phoenixAnimations => {
                        const animationContainer = document.querySelector('#animation-pose');
                        animationContainer.innerHTML = ""; // Clear previous content

                        for (const animationKey of Object.keys(characterData.animations)) {
                            const previewContainer = document.createElement('div');
                            previewContainer.classList.add('relative', 'w-24', 'h-18', 'bg-gray-800', 'rounded', 'overflow-hidden', 'cursor-pointer');
                            previewContainer.setAttribute('data-animation-key', characterData.animations[animationKey]);

                            const img = document.createElement('img');
                            img.classList.add('w-full', 'h-full', 'object-contain', 'opacity-80', 'hover:opacity-100', 'transition-opacity', 'duration-300');

                            const animation = phoenixAnimations[`${characterData.animations[animationKey]}`]; // Get the animation object by its key
                            const imageQueue = animation.imageQueue;
                            let currentIndex = 0;
                            img.src = imageQueue[currentIndex];

                            const interval = setInterval(() => {
                                currentIndex = (currentIndex + 1) % imageQueue.length;
                                img.src = imageQueue[currentIndex];
                            }, animation.frameDuration);

                            previewContainer.addEventListener('mouseleave', () => {
                                clearInterval(interval);
                                img.src = imageQueue[0];
                            });

                            previewContainer.addEventListener('click', () => {
                                const animationKey = previewContainer.getAttribute('data-animation-key');
                                this.ws.send(JSON.stringify({ type: 'sendPose', data: animationKey }));
                            });
                            const overlayContainer = document.createElement('div');
                            overlayContainer.classList.add('absolute', 'inset-0', 'flex', 'items-center', 'justify-center', 'bg-black', 'bg-opacity-0', 'hover:bg-opacity-50', 'transition-opacity', 'duration-300');

                            const title = document.createElement('h3');
                            title.textContent = Object.keys(characterData.animations).find(key => JSON.stringify(characterData.animations[key]) === JSON.stringify(animationKey)); // Use the display name as title
                            title.classList.add('text-white', 'text-sm', 'font-bold', 'z-10', 'opacity-0', 'hover:opacity-100', 'transition-opacity', 'duration-300');

                            overlayContainer.appendChild(title);
                            previewContainer.appendChild(img);
                            previewContainer.appendChild(overlayContainer);

                            animationContainer.appendChild(previewContainer); // Append here
                        }
                    })
                    .catch(error => console.error('Error loading Phoenix Wright animations:', error));
            })
            .catch(error => console.error('Error loading Phoenix Wright data:', error));
    }
}
async function bufferMessage(lastMessage, delay = 30) {
    const novelTextBox = document.getElementById('novelTextBox');
    const characterName = document.getElementById('characterName');
    characterName.textContent = lastMessage.user;
    const chars = lastMessage.message.split('');
    let newText = '';

    // Create an AudioContext for generating the scroll sound
    const audioContext = new AudioContext();

    // Initialize scrollSound variable
    let scrollSound;

    // Function to generate the scroll sound
    function generateScrollSound(context) {
        const osc = context.createOscillator();
        const gainNode = context.createGain();

        // Configure oscillator
        osc.type = 'sine'; // Use sine wave for smoother sound
        osc.frequency.value = 400; // Adjust frequency as needed
        osc.start();

        // Configure gain node
        gainNode.gain.value = 0.1; // Adjust volume as needed

        // Connect nodes
        osc.connect(gainNode);
        gainNode.connect(context.destination);

        return {
            stop() {
                osc.stop();
                osc.disconnect();
                gainNode.disconnect();
            }
        };
    }

    // Function to stop the scroll sound
    function stopScrollSound() {
        if (scrollSound) {
            scrollSound.stop();
            scrollSound = null;
        }
    }

    // Iterate through each character in the message
    for (let char of chars) {
        // Add the character to the new text
        newText += char;

        // Play the text scroll sound
        stopScrollSound();
        scrollSound = generateScrollSound(audioContext);

        // Update the text box with the new text
        novelTextBox.innerHTML = newText;

        // Pause execution for a short delay to simulate typing effect
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Stop the scroll sound when the message display is complete
    stopScrollSound();
}


const modal = document.getElementById('modal');
const modalOverlay = modal.querySelector('.modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalLabel = document.getElementById('modal-label');
const modalInput = document.getElementById('input');
const modalSubmit = document.getElementById('modal-submit');

function openModal(title, label, callback, other) {
    modalTitle.textContent = title;
    modalLabel.textContent = label;
    modalInput.value = '';
    modal.classList.remove('hidden');

    // Attach submit event listener to the submit button
    function submitHandler() {
        const value = modalInput.value;
        modal.classList.add('hidden'); // Hide the modal
        callback(value, other); // Call the provided callback function with the input value
        modalSubmit.removeEventListener('click', submitHandler); // Remove the event listener
    }

    // Attach submit event listener to the submit button
    modalSubmit.addEventListener('click', submitHandler);

    // Attach event listener to close the modal when clicking outside the modal content
    modalOverlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        // Remove the submit event listener to prevent memory leaks
        modalSubmit.removeEventListener('click', submitHandler);
    });
}

function createRoom(roomName, object) {
    showLoading(`Creating room...`)
    object.ws.send(JSON.stringify({ type: 'createRoom', roomName: roomName, name: document.querySelector('#usernameInput').value.trim() }));
    console.log('Creating room:', roomName);
}

function getTopic(topic, object) {
    document.getElementById('roomManagementLayer').classList.add('hidden');
    document.getElementById('textOrSpeechLayer').classList.remove('hidden');
    object.ws.send(JSON.stringify({ type: 'setTopic', data: topic, roomName: object.roomName }));
}

function joinRoom(roomName, object) {
    // Perform the action for joining a room with the provided roomName
    document.getElementById('roomManagementLayer').classList.add('hidden');
    showLoading('Joining room...')
    this.ws.send(JSON.stringify({ type: 'joinRoom', roomName: roomName, name: document.querySelector('#usernameInput').value.trim() }));
    console.log('Joining room:', roomName);
}

function closeNameAlertModal() {
    document.querySelector('#nonamealert').classList.add('hidden'); // Remove the modal from the DOM
}

function showLoading(message) {
    var loadingOverlay = document.getElementById('loading-overlay');
    var loadingMessage = document.getElementById('loading-message');

    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = message || 'Loading...';
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    var loadingOverlay = document.getElementById('loading-overlay');

    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}
function showFullScreenAlert(data) {
    let message = data.message;
    var alertDiv = document.getElementById('full-screen-alert');
    var alertMessage = document.getElementById('objection-message');
    var name = document.getElementById('objection-uname');
    var time = document.getElementById('objection-time');


    if (alertMessage) {
        alertMessage.textContent = message.message;
        name.textContent = message.user;
        time.textContent = formatTimestamp(message.timestamp);
    }

    if (alertDiv) {
        alertDiv.classList.remove('hidden');
    }

    setTimeout(function () {
        hideFullScreenAlert();
    }, 5000);
}

function hideFullScreenAlert() {
    var alertDiv = document.getElementById('full-screen-alert');

    // Hide alert
    if (alertDiv) {
        alertDiv.classList.add('hidden');
    }
}
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/(\d+)-(\w+)-(\d+)/, '$1-$2-$3');
}
// Function to populate select box with options
function populateSelectBox(selectElement, options) {
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.key;
        optionElement.textContent = option.characterName;
        selectElement.appendChild(optionElement);
    });
}

// Function to group characters by side
function groupCharactersBySide(characters) {
    const groupedCharacters = {
        defence: [],
        prosecution: []
    };

    for (const characterName in characters) {
        const character = characters[characterName];
        if (character.side === 'defence') {
            groupedCharacters.defence.push(character);
        } else if (character.side === 'prosecution') {
            groupedCharacters.prosecution.push(character);
        }
    }

    return groupedCharacters;
}

// Function to fetch character data from server
function fetchCharacterData() {
    fetch('/load_characters')
        .then(response => response.json())
        .then(characters => {
            // Group characters by side
            const groupedCharacters = groupCharactersBySide(characters);

            // Populate select boxes with character names
            const defenceSelect = document.getElementById('defenceSelect');
            const prosecutionSelect = document.getElementById('prosecutionSelect');

            populateSelectBox(defenceSelect, groupedCharacters.defence);
            populateSelectBox(prosecutionSelect, groupedCharacters.prosecution);
        })
        .catch(error => console.error('Error fetching character data:', error));
}
function showSplashImage(imageSrc) {
    document.getElementById('splash-image').src = imageSrc;
    document.getElementById('splash-container').classList.remove('hidden');
    setTimeout(function () {
        document.getElementById('splash-container').classList.add('opacity-100');
    }, 10);
    setTimeout(function () {
        hideSplashImage();
    }, 2000);
}

function hideSplashImage() {
    document.getElementById('splash-container').classList.remove('opacity-100');
    setTimeout(function () {
        document.getElementById('splash-container').classList.add('hidden');
    }, 500);
}

const sceneManager = new SceneManager();
sceneManager.loadScenes();
sceneManager.loadEvents();
hideLoading();