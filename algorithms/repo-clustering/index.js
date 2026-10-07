const repos = require('./data');
const { preprocessData, calculateTfIdf } = require('./nlp');
const { kMeansClustering } = require('./kmeans');

console.log('--- Custom Semantic Repo Clustering ---');
console.log(`Processing ${repos.length} mock repositories...`);

// 1. NLP Preprocessing
const tokenizedDocs = preprocessData(repos);
console.log('Tokenization complete.');

// 2. TF-IDF Calculation
const { vectors, vocabulary } = calculateTfIdf(tokenizedDocs);
console.log(`TF-IDF complete. Vocabulary size: ${vocabulary.length}`);

// 3. K-Means Clustering
// We'll look for 3 domains: Frontend, Backend/API, DataScience/ML
const k = 3;
console.log(`\nRunning K-Means algorithm (k=${k})...`);
const clusters = kMeansClustering(vectors, k);

// 4. Output Results
console.log('\n--- CLUSTERING RESULTS ---\n');

clusters.forEach((clusterIndices, i) => {
    console.log(`CLUSTER ${i + 1}:`);

    if (clusterIndices.length === 0) {
        console.log("  (Empty Cluster)");
        console.log();
        return;
    }

    clusterIndices.forEach(idx => {
        console.log(`  - ${repos[idx].name}: ${repos[idx].topics.join(', ')}`);
    });
    console.log();
});

console.log('Done.');
