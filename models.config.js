const models = {
    openai: {
      model: "text-davinci-003",
      params: {
        max_tokens: 1000,
        temperature: 0.7,
      },
    },
    anthropic: {
      model: "claude-3-opus-20240229",
      params: {
        max_tokens: 1000,
        stop_sequences: [],
      },
    },
  };
  
module.exports = models;