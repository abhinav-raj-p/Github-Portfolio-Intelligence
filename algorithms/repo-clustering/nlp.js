// A simple list of stop words
const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with']);

function tokenize(text) {
    // Lowercase, replace non-words with space, split by space, remove empty and stop words
    const words = text.toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter(word => word.length > 1 && !STOP_WORDS.has(word));
    return words;
}

function preprocessData(repos) {
    const documents = repos.map(repo => {
        // Combine name, description, and topics into one document string
        const text = `${repo.name} ${repo.description} ${repo.topics.join(' ')}`;
        return tokenize(text);
    });

    return documents;
}

function calculateTfIdf(documents) {
    // 1. Build Vocabulary and Document Frequencies
    const docFreq = {};
    const vocabulary = new Set();

    documents.forEach(doc => {
        const uniqueWords = new Set(doc);
        uniqueWords.forEach(word => {
            vocabulary.add(word);
            docFreq[word] = (docFreq[word] || 0) + 1;
        });
    });

    const vocabArray = Array.from(vocabulary).sort();
    const numDocs = documents.length;

    // 2. Calculate Inverse Document Frequency (IDF)
    const idf = {};
    vocabArray.forEach(word => {
        // IDF = log(N / DF)
        idf[word] = Math.log(numDocs / docFreq[word]);
    });

    // 3. Calculate TF-IDF vectors for each document
    const tfidfVectors = documents.map(doc => {
        const tf = {};
        doc.forEach(word => {
            tf[word] = (tf[word] || 0) + 1;
        });

        const vector = new Array(vocabArray.length).fill(0);
        vocabArray.forEach((word, index) => {
            if (tf[word]) {
                // TF = count / doc_length
                const termFreq = tf[word] / doc.length;
                vector[index] = termFreq * idf[word];
            }
        });
        return vector;
    });

    return { vectors: tfidfVectors, vocabulary: vocabArray };
}

module.exports = {
    preprocessData,
    calculateTfIdf
};
