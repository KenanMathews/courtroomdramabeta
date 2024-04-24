const fs = require('fs');
const path = require('path');

let isPlaybackInProgress = false;

  function loadCharactersAndAnimations() {
    let assetsData;
      try {
          assetsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));
      } catch (err) {
          console.error('Error loading asset data:', err);
          assetsData = {};
      }
    const characters = {};

    for (const key in assetsData) {
      const asset = assetsData[key];

      if (key.startsWith('character-')) {
        const characterName = asset.characterName;
        const characterAnimations = {};

        for (const animationKey in asset.animations) {
          const animationName = animationKey;
          const animationData = assetsData[asset.animations[animationKey]];
          characterAnimations[animationName] = {
            imageQueue: animationData.imageQueue,
            frameDuration: animationData.frameDuration,
            characterName: animationData.characterName,
          };
        }

        characters[key] = {
          imageSrc: asset.imageSrc,
          characterName: characterName,
          key: key,
          side: asset.side,
          spriteWidth: asset.spriteWidth,
          spriteHeight: asset.spriteHeight,
          spriteX: asset.spriteX,
          spriteY: asset.spriteY,
          animations: characterAnimations,
        };
      }
    }

    return characters;
  }

function setPlaybackState(state) {
  isPlaybackInProgress = state;
}

function getPlaybackState() {
  return isPlaybackInProgress;
}

module.exports = {
  setPlaybackState,
  getPlaybackState,
  loadCharactersAndAnimations
};