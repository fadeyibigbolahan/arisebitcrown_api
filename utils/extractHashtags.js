function extractHashtags(sentence) {
  // Regular expression to match hashtags
  const hashtagPattern = /#[a-zA-Z0-9_]+/g;
  // Extract hashtags
  const hashtags = sentence.match(hashtagPattern);
  // Return the array of hashtags or an empty array if none found
  return hashtags || [];
}

module.exports = extractHashtags;
