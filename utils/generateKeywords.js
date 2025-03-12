function generateKeywords(text, numberOfKeywords) {
  // Remove punctuation and convert to lowercase
  text = text
    .replace(/[^\w\s]|_/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  // Split text into words
  const words = text.split(" ");

  // Create a map to store word frequencies
  const wordFrequencyMap = {};
  words.forEach((word) => {
    if (word in wordFrequencyMap) {
      wordFrequencyMap[word]++;
    } else {
      wordFrequencyMap[word] = 1;
    }
  });

  // Sort words by frequency
  const sortedWords = Object.keys(wordFrequencyMap).sort(
    (a, b) => wordFrequencyMap[b] - wordFrequencyMap[a]
  );

  // Take the top n words
  const topKeywords = sortedWords.slice(0, numberOfKeywords);

  return topKeywords;
}

module.exports = generateKeywords;
