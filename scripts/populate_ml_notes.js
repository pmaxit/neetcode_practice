import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
});

const MLSystemDesignNote = sequelize.define('MLSystemDesignNote', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.STRING,
    history: DataTypes.TEXT,
    example: DataTypes.TEXT,
    where_it_is_used: DataTypes.TEXT,
    technical_deep_dive: DataTypes.TEXT,
    scheduled_date: DataTypes.DATEONLY
}, { timestamps: false, tableName: 'ml_system_design_notes' });

const mlNotes = [
    {
        title: "RLHF & PPO: Aligning LLMs with Human Preference",
        history: "Developed by OpenAI (2022) to address the 'alignment problem' where models optimized for next-token prediction might produce toxic or unhelpful content. PPO (Proximal Policy Optimization) became the standard actor-critic algorithm for this tuning phase.",
        example: "A model creates three answers. A human ranks them. A 'Reward Model' is trained on these ranks to predict human preference, then the LLM is fine-tuned to maximize this reward.",
        where_it_is_used: "ChatGPT, Claude, Llama-3, and virtually every high-performing consumer-facing LLM.",
        technical_deep_dive: "The process involves three steps: SFT (Supervised Fine-Tuning), Reward Modeling, and RL via PPO. In PPO, we use a 'Kullback-Leibler (KL) divergence' penalty to ensure the tuned model doesn't drift too far from the original SFT model, preventing 'reward hacking' where the model exploits the reward function without being helpful."
    },
    {
        title: "Rotary Positional Embeddings (RoPE) for Long Context",
        history: "Introduced in the Roformer paper (2021) and popularized by Llama. It replaced traditional absolute positional encodings and relative encodings with a rotation-based approach in the complex plane.",
        example: "Allows models to follow long-range dependencies across 100k+ tokens without performance degradation seen in older Sinusoidal patterns.",
        where_it_is_used: "Llama-2/3, Mistral, PaLM, and GPT-NeoX.",
        technical_deep_dive: "RoPE encodes position by rotating the query and key vectors in a D-dimensional space using a rotation matrix. Unlike earlier methods, it preserves the relative distance between tokens as a dot product: <f(q, m), f(k, n)> = g(q, k, m-n). This 'relative' property allows for easy extrapolation to sequence lengths longer than seen during training."
    },
    {
        title: "Two-Tower Architecture for Scale Candidate Retrieval",
        history: "Foundational RecSys pattern popularized by Google (YouTube) and Pinterest. It solves the O(N) scoring bottleneck by decoupling users and items into two separate neural pipelines.",
        example: "YouTube matching your 'User Vector' (hobbies, past watches) against 50 million 'Video Vectors' in milliseconds using dot products.",
        where_it_is_used: "YouTube, TikTok, Netflix, and Amazon search/recommendation systems.",
        technical_deep_dive: "The Query Tower (User) and Candidate Tower (Item) produce embeddings in the same latent space. Because they are independent, item embeddings can be pre-computed and stored in a vector database (like HNSW). At inference, we only run the Query Tower and perform an MIPS (Maximum Inner Product Search) across the item indices, turning a neural scoring problem into a geometric search problem."
    },
    {
        title: "MMoE: Multi-gate Mixture-of-Experts for Multi-Objective Ranking",
        history: "Proposed by Google (2018) to solve 'negative transfer' in multi-task learning, where optimizing for 'Clicks' might hurt 'Watch Time' due to conflicting gradients.",
        example: "A recommendation model predicting both if you'll 'Like' a post AND if you'll 'Share' it, using dedicated expert networks for each task while sharing lower-level representations.",
        where_it_is_used: "Large-scale social feeds (Facebook, Instagram) and e-commerce platforms.",
        technical_deep_dive: "Standard multi-task models use a shared bottom layer. MMoE adds expert sub-networks and a 'Gating' network for EACH task. Each gate computes a weighted sum of experts specific to its task. This allows the model to selectively share or isolate features, effectively handling cases where tasks are unrelated or adversarial."
    },
    {
        title: "vLLM & PagedAttention: Optimizing KV Cache Throughput",
        history: "Breakthrough in 2023 from UC Berkeley. It observed that the KV Cache (for LLM memory) was extremely fragmented and wasted ~60-80% of GPU memory.",
        example: "Allowing a single A100 GPU to serve 20 users simultaneously instead of 2, by dynamically allocating memory blocks like an OS Virtual Memory manager.",
        where_it_is_used: "Model serving infrastructures, high-throughput LLM APIs, and cloud providers.",
        technical_deep_dive: "PagedAttention partitions the KV cache into small blocks. Unlike traditional linear allocation, these blocks move through memory like pages in an OS. This eliminates 'internal fragmentation' (reserved but unused space) and allows for 'Copy-on-Write' for parallel sampling (e.g., beam search), where multiple requests share the same prefix cache until they diverge."
    },
    {
        title: "Model Quantization: NF4 and Double Quantization in Production",
        history: "Popularized by the QLoRA paper (2023) and the 'bitsandbytes' library. It enabled training 70B models on a single consumer GPU (24GB).",
        example: "Compressing a 140GB model (FP16) down to 35GB (INT4) while losing less than 0.1% accuracy.",
        where_it_is_used: "Local LLM deployments (Ollama, LM Studio), low-latency edge devices, and resource-constrained enterprise clusters.",
        technical_deep_dive: "NF4 (NormalFloat 4-bit) optimizes for the fact that neural network weights typically follow a Gaussian distribution. It creates an optimal mapping of 16 values. Double Quantization further compresses the 'quantization constants' themselves, saving an additional 0.3 bits per parameter without accuracy loss."
    },
    {
        title: "Contrastive Learning & InfoNCE Loss",
        history: "Originally rooted in Noise Contrastive Estimation (NCE), early 2010s. Breakthrough with SimCLR and CLIP (2020) which used self-supervised learning.",
        example: "CLIP treating image-text pairs as positive and all others as negative.",
        where_it_is_used: "Multi-modal models, Image Search, and unsupervised pre-training.",
        technical_deep_dive: "InfoNCE loss is defined as -E[log(exp(sim(qi, k+)/t) / sum(exp(sim(qi, kj)/t)))]. It forces positive pairs to occupy the same latent space while spreading negatives."
    },
    {
        title: "HNSW (Hierarchical Navigable Small Worlds)",
        history: "Malkov et al. (2016). Improved over NSW by introducing a multi-layered graph structure.",
        example: "Multi-layer graph where top layers cover global space and bottom layers provide fine-grained search.",
        where_it_is_used: "Vector databases, RAG pipelines, and Recommendation engines.",
        technical_deep_dive: "Hierarchical property ensures O(log(N)) complexity by providing shortcuts across the vector space."
    },
    {
        title: "FlashAttention-2: IO-Awareness",
        history: "Tri Dao (2022-2023). Optimized for memory-bound GPUs by minimizing HBM accesses.",
        example: "Allows context windows of 128k+ tokens by computing attention in SRAM blocks.",
        where_it_is_used: "Llama-3, GPT-4, and all modern LLMs.",
        technical_deep_dive: "Uses 'Tiling' and 'Recomputation' to avoid writing the N^2 attention matrix to global memory."
    },
    {
        title: "Speculative Decoding",
        history: "Leviathan et al. (2023). Uses a small draft model to predict tokens then verifies with a large model.",
        example: "Use 100M param model to guess 5 tokens; use 70B model to verify in one pass.",
        where_it_is_used: "vLLM, TGI, and low-latency chatbots.",
        technical_deep_dive: "Achieves speedups without quality loss by leveraging rejection sampling on the large model's logits."
    },
    {
        title: "Mixture of Experts (MoE) & Gating Mechanisms",
        history: "Jordan & Jacobs (1990s); Shazeer (2017). Sparsely-gated experts to scale model capacity without compute cost.",
        example: "Switching between 8 experts, using only 2 for each token.",
        where_it_is_used: "Mixtral 8x7B, GPT-4 (rumored).",
        technical_deep_dive: "Uses load-balancing loss and noisy top-k gating to prevent expert collapse during training."
    }
];

async function run() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        
        for (const note of mlNotes) {
            const [record, created] = await MLSystemDesignNote.findOrCreate({
                where: { title: note.title },
                defaults: note
            });
            if (created) {
                console.log(`✅ Added: ${note.title}`);
            } else {
                console.log(`ℹ️ Already exists: ${note.title}`);
            }
        }
        
        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

run();
