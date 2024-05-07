const natural = require('natural');
const afinn = new natural.Lexicon('AFINN');

// Function to get the sentiment score of a word from the AFINN lexicon
function findClosestWord(sentence, wordList) {
    let maxSimilarity = -Infinity;
    let closestWord = null;

    // Calculate similarity between the sentence and each word in the list
    wordList.forEach(word => {
        const similarity = natural.JaroWinklerDistance(sentence.toLowerCase(), word.toLowerCase());
        
        // Update closest word if current word has higher similarity
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            closestWord = word;
        }
    });
    return closestWord;
}

module.exports = {
    findClosestWord,
}