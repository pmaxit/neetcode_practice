import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3307,
    dialect: 'mysql',
    logging: false
});

const MLSystemDesignNote = sequelize.define('MLSystemDesignNote', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    history: DataTypes.TEXT,
    example: DataTypes.TEXT,
    where_it_is_used: DataTypes.TEXT,
    technical_deep_dive: DataTypes.TEXT('long'),
    scheduled_date: DataTypes.DATEONLY
}, { timestamps: false, tableName: 'ml_system_design_notes' });

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB for seeding...');
        
        // Sync schema changes
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
        
        const notes = [
            {
                title: "Ranking Evaluation: The MAP vs. NDCG Dilemma",
                category: "General",
                history: "Early IR systems used Boolean retrieval (match/no-match). In the early 2000s, as web search exploded, 'relevance' became a gradient. Normalized Discounted Cumulative Gain (NDCG) emerged from the need to reward systems that put highly relevant items at the very top, while Mean Average Precision (MAP) remained the gold standard for binary relevance sets.",
                example: "Imagine a search for 'running shoes'. If the #1 result is a blog post about running (relevant) but the #10 result is a checkout page for Nike Pegasus (highly relevant), a binary MAP score treats them as equal matches. NDCG will penalize the system heavily for burying the 'highly relevant' transaction page at rank 10.",
                where_it_is_used: "Used in Amazon Search, Google Ads ranking, and Netflix recommendation carousels where the relative order of quality is business-critical.",
                technical_deep_dive: "NDCG is defined by DCG = Σ (2^rel_i - 1) / log2(i + 1). The log denominator 'discounts' items based on their position (i). At the Staff level, you must understand the 'position bias'—users rarely scroll. We use 'IDCG' (Ideal DCG) to normalize the score between 0 and 1, allowing us to compare performance across different queries with varying numbers of relevant results."
            },
            {
                title: "Vector Retrieval & HNSW Optimization",
                category: "ML Infrastructure",
                history: "Before 2015, retrieval was mostly keyword-based (TF-IDF/BM25). With the rise of deep embeddings (BERT/ResNet), searching through billions of vectors became the bottleneck. Hierarchical Navigable Small Worlds (HNSW) solved the O(N) search problem by creating a multi-layer graph structure that allows O(log N) approximate nearest neighbor traversal.",
                example: "Spotify needs to find 10 tracks similar to a 128-dimensional embedding of a song you just liked. Searching 100M songs linearly is impossible in 50ms. HNSW allows 'zooming in' from a coarse high-level graph to a fine-grained local neighborhood.",
                where_it_is_used: "Powering Pinterest's Visual Search, Spotify's 'Discover Weekly', and RAG (Retrieval Augmented Generation) pipelines for LLMs.",
                technical_deep_dive: "HNSW builds a skip-list style hierarchy of graphs. The top layer has few nodes and long edges, while the bottom layer contains all nodes. A key Staff Engineer trade-off is the 'efConstruction' vs 'efSearch' parameters—increasing efConstruction yields higher recall but takes days to index, whereas efSearch controls the search accuracy vs. latency at runtime."
            },
            {
                title: "Model Drift: Statistical Guardrails in Production",
                category: "ML Infrastructure",
                history: "The 'set and forget' model era ended when companies realized that model performance decays as the world changes (e.g., consumer behavior during 2020). Detection moved from simple accuracy monitoring (which requires labels, often delayed) to distribution monitoring (which uses live inference data).",
                example: "A fraud detection model trained on pre-holiday spending patterns might suddenly flag legitimate transactions during Black Friday because the 'feature distribution' of purchase frequency has shifted. This is 'Data Drift'.",
                where_it_is_used: "Critical in Fintech (Risk/Fraud), E-commerce (Price elasticity), and Healthcare (Diagnostic changes over time).",
                technical_deep_dive: "The Population Stability Index (PSI) is the industry standard: PSI = Σ (Actual% - Expected%) * ln(Actual% / Expected%). A PSI > 0.2 indicates a significant shift requiring retraining. Advanced systems use the Kolmogorov-Smirnov (KS) test to detect if two samples come from the same distribution without assuming a normal distribution shape."
            },
            {
                title: "NLP: The Evolution of Sequence Attribution",
                category: "NLP",
                history: "Sequence modeling shifted from RNNs (vanishing gradients) to LSTMs (gated memory) and finally to the Attention mechanism in 'Attention is All You Need' (2017). The core shift was moving from serial processing to parallelizable global context.",
                example: "Translation systems like Google Translate. In the sentence 'The bank of the river', traditional systems struggled with 'bank' unless the context was immediately adjacent. Self-attention allows 'bank' to look at 'river' even if they are 50 words apart.",
                where_it_is_used: "LLMs (GPT-4), Sentiment Analysis at scale, and Legal Document classification.",
                technical_deep_dive: "The Scaled Dot-Product Attention calculates Attention(Q, K, V) = softmax(QK^T / √d_k)V. The √d_k scaling is a critical Staff-level detail—it prevents the dot product from growing too large in high dimensions, which would push the softmax into regions with extremely small gradients, effectively 'killing' the learning process."
            }
        ];

        for (const note of notes) {
            await MLSystemDesignNote.create(note);
        }
        
        console.log('✅ Seeded 4 advanced ML notes.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
