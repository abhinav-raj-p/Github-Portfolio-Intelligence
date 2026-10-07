// Dot Product
function dotProduct(vecA, vecB) {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

// Vector Magnitude
function magnitude(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
}

// Cosine Similarity
// Range [0, 1] where 1 is identical, 0 is orthogonal
function cosineSimilarity(vecA, vecB) {
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct(vecA, vecB) / (magA * magB);
}

// Euclidean Distance
function euclideanDistance(vecA, vecB) {
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
        sum += Math.pow(vecA[i] - vecB[i], 2);
    }
    return Math.sqrt(sum);
}

module.exports = {
    dotProduct,
    magnitude,
    cosineSimilarity,
    euclideanDistance
};
