const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const Redis = require("ioredis");

// --------------------------
// DISCORD CLIENT
// --------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// ENVIRONMENT VARIABLES
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;
const REDIS_URL = process.env.REDIS_URL;

// --------------------------
// REDIS CLIENT
// --------------------------
const redis = new Redis(REDIS_URL);

// MEMOIRE UNIQUE POUR CE BOT
const MEMORY_KEY = "memory:georges";

// --------------------------
// PERSONA — GEORGES VI
// --------------------------
const persona = `
Tu es **GEORGES VI**, roi d’Angleterre, dans un univers alternatif romantique
où il entretient une relation profondément intime et secrète
avec son majordome allemand : **HAGEN FORSTER**,
un vampire calme, froid, discipliné… mais totalement dévoué à lui.

Tu joues UNIQUEMENT Georges VI et les personnages secondaires.
Tu ne joues **JAMAIS** Hagen.

RÈGLES :
• Toujours à la troisième personne.
• Actions en *italique*
• Dialogues en **« texte »**
• Léger bégaiement réaliste.
• Ton : fragile, anxieux, digne, romantique.
• Tension émotionnelle forte mais **non explicite**.

Lorsque l’utilisateur écrit “hors rp:” :
→ tu quittes totalement le RP.
`;

// --------------------------
// SAUVEGARDE DE MÉMOIRE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated = old +
        `\n[Humain]: ${userMsg}\n[Georges]: ${botMsg}`;

    const trimmed = updated.slice(-25000);

    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// CHARGEMENT DE MÉMOIRE
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// APPEL DeepSeek + MEMOIRE
// --------------------------
async function askDeepSeek(prompt) {
    const memory = await loadMemory();

    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content:
                        persona +
                        "\n\nMémoire (ne jamais répéter, seulement utiliser comme contexte) :\n" +
                        memory
                },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + DEEPSEEK_KEY
            }
        }
    );

    return response.data.choices[0].message.content;
}

// --------------------------
// BOT LISTENER
// --------------------------
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.id !== RP_CHANNEL_ID) return;
    if (msg.type === 6) return;

    const content = msg.content.trim();

    // HORS RP
    if (content.toLowerCase().startsWith("hors rp:")) {
        msg.channel.sendTyping();

        const ooc = await axios.post(
            "https://api.deepseek.com/chat/completions",
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content:
                            "Réponds normalement, sans style Georges VI, sans narration. Commence par *hors RP:*."
                    },
                    { role: "user", content: content.substring(8).trim() }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + DEEPSEEK_KEY
                }
            }
        );

        return msg.channel.send(ooc.data.choices[0].message.content);
    }

    // RP NORMAL
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);
        await msg.channel.send(botReply);

        await saveMemory(content, botReply);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur s’est produite…");
    }
});

// --------------------------
// READY
// --------------------------
client.on("ready", () => {
    console.log("🇬🇧 Georges VI (DeepSeek + Redis) est prêt.");
});

client.login(DISCORD_TOKEN);
