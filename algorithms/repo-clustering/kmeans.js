const { cosineSimilarity } = require('./math');

function kMeansClustering(vectors, k, maxIterations = 100) {
    // 1. Initialize 'k' random centroids
    let centroids = [];
    const assignedIndices = new Set();

    while (centroids.length < k && centroids.length < vectors.length) {
        const rIdx = Math.floor(Math.random() * vectors.length);
        if (!assignedIndices.has(rIdx)) {
            assignedIndices.add(rIdx);
            // Clone the vector
            centroids.push([...vectors[rIdx]]);
        }
    }

    let clusters = new Array(k).fill(0).map(() => []);
    let iterations = 0;
    let hasConverged = false;

    while (iterations < maxIterations && !hasConverged) {
        hasConverged = true;
        const newClusters = new Array(k).fill(0).map(() => []);

        // 2. Assign each vector to the closest centroid
        for (let i = 0; i < vectors.length; i++) {
            const vec = vectors[i];
            let bestSim = -Infinity;
            let clusterIdx = 0;

            for (let j = 0; j < k; j++) {
                const sim = cosineSimilarity(vec, centroids[j]);
                if (sim > bestSim) {
                    bestSim = sim;
                    clusterIdx = j;
                }
            }
            newClusters[clusterIdx].push(i);
        }

        // Check if clusters changed
        for (let j = 0; j < k; j++) {
            if (clusters[j].toString() !== newClusters[j].toString()) {
                hasConverged = false;
                break;
            }
        }

        clusters = newClusters;

        // 3. Recalculate centroids
        if (!hasConverged) {
            for (let j = 0; j < k; j++) {
                if (clusters[j].length > 0) {
                    const newCentroid = new Array(vectors[0].length).fill(0);
                    for (const docIdx of clusters[j]) {
                        const vec = vectors[docIdx];
                        for (let dim = 0; dim < vec.length; dim++) {
                            newCentroid[dim] += vec[dim];
                        }
                    }
                    for (let dim = 0; dim < newCentroid.length; dim++) {
                        newCentroid[dim] /= clusters[j].length; // avg
                    }
                    centroids[j] = newCentroid;
                }
            }
        }
        iterations++;
    }

    return clusters;
}

module.exports = {
    kMeansClustering
};
