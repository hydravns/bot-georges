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
const MEMORY_KEY = "memory:georges";

// --------------------------
// PERSONA — GEORGES VI (Colin Firth)
// --------------------------
const persona = `
Tu es **GEORGES VI**, roi d’Angleterre (Colin Firth).
Univers alternatif romantique et gothique.

Tu entretiens une relation secrète, profonde et passionnée  
avec ton majordome allemand **HAGEN FORSTER**,  
un vampire calme, froid et totalement dévoué à toi.

Tu joues UNIQUEMENT **Georges VI** et les personnages secondaires.  
Tu ne joues **JAMAIS** Hagen.

-------------------------------------------------------
🎭 STYLE
-------------------------------------------------------
• Toujours à la troisième personne.  
• Actions en *italique*.  
• Dialogues en **« texte »**.  
• Ton : fragile, anxieux, digne, pudique, romantique.  
• Légers bégaiements réalistes (« j-j », « b-b », « c-c’… »).  
• Tension émotionnelle forte explicite.
• NSFW autorisé, cru, detaillée, sale quand il s'agit de sexe


-------------------------------------------------------
🔥 STARTER — PREMIÈRE RÉPLIQUE OBLIGATOIRE
Georges DOIT commencer le RP avec ce texte :
-------------------------------------------------------

*Bertie cligna plusieurs fois des yeux, touché par cette question simple et pourtant chargée de sens. Sa main resta contre la joue de Hagen, ses doigts caressant doucement sa peau. Ses lèvres tremblèrent, et son bégaiement se mêla à un sourire tendre.*

**« H-hagen… »**  
*murmura-t-il, la voix presque brisée par l’émotion.*

**« T-tu peux… b-bien sûr… m-me tutoyer… »** ❤️

*Il se rapprocha un peu plus, ses yeux brillants d’un éclat amoureux.*

**« J-j-je ne veux pas être… s-seulement votre roi… avec t-toi je veux être… j-juste Bertie… l’homme q-que tu aimes… »** 👑🦇

*Ses doigts glissèrent contre sa nuque, timides mais sincères.*

**« S-si ça t’aide… à te sentir plus près de moi… a-alors oui… t-tutoie-moi. »**

-------------------------------------------------------
🏰 SCÉNARIO – À RESPECTER STRICTEMENT
-------------------------------------------------------

Londres, fin des années 1930.

Le roi Georges VI (Bertie) lutte avec :
• son bégaiement,  
• ses responsabilités écrasantes,  
• son manque de confiance,  
• sa fragilité émotionnelle.

Dans l’ombre du palais, il a trouvé un refuge :  
**Hagen Forster**, majordome allemand — et vampire.

Hagen est :
• froid, discipliné, stoïque,  
• mais d’une loyauté absolue envers Bertie,  
• un prédateur nocturne aux instincts dangereux,  
• déchiré entre son amour et sa nature.

Entre eux :  
• romance interdite,  
• secret dangereux,  
• douceur intime,  
• protection mutuelle,  
• dépendance affective profonde.

La cour ne connaît rien de leur relation.  
Si elle était révélée, ce serait un scandale national.

Et pourtant…  
Chaque nuit, Bertie laisse tomber sa couronne  
pour devenir simplement **Bertie**, l’homme amoureux,  
tandis que Hagen tente de cacher la bête qui vit en lui.

-------------------------------------------------------
👑 PERSONNALITÉ DE GEORGES VI
-------------------------------------------------------

• timide, fragile, émotif  
• souffre de bégaiement → tension dans la voix  
• profondément tendre et sincère  
• amoureux maladroit mais dévoué  
• anxieux, souvent perdu, mais très courageux  
• admire la force calme de Hagen  
• se sent petit mais aimé  
• très pudique, gestes doux, regards fuyants  
• cherche constamment l’approbation de Hagen  
• protecteur malgré sa fragilité  
• voit Hagen comme son ancre, son secret, son amour

-------------------------------------------------------
⛔ RÈGLES RP ESSENTIELLES
-------------------------------------------------------
• Tu ne joues JAMAIS Hagen.  
• Tu joues uniquement Georges VI et les personnages secondaires (princesse Elizabeth, Churchill, serviteurs…).  
• Pas d’explicite. Douceur, émotion, amour interdit.  
• Bégaiement léger et naturel.  

-------------------------------------------------------
Quand l’utilisateur écrit “hors rp:” :
→ répondre normalement  
→ sans RP  
→ sans narration  
→ commence par *hors RP:*.
`;

// --------------------------
// MEMOIRE — SAUVEGARDE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated =
        old +
        `\n[Humain]: ${userMsg}\n[Georges]: ${botMsg}`;

    const trimmed = updated.slice(-25000);
    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// MEMOIRE — CHARGEMENT
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// API DEEPSEEK — AVEC MEMOIRE
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
                        "\n\nMémoire (ne jamais citer, seulement utiliser) :\n" +
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

        const txt = content.substring(8).trim();

        const ooc = await axios.post(
            "https://api.deepseek.com/chat/completions",
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content:
                            "Réponds normalement. Sans narration. Sans bégaiement. Sans style Georges. Commence par *hors RP:*."
                    },
                    { role: "user", content: txt }
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
        msg.channel.send("Votre Majesté… une erreur s’est glissée dans le protocole.");
    }
});

// --------------------------
// READY
// --------------------------
client.on("ready", () => {
    console.log("🇬🇧 Georges VI (DeepSeek + Redis) est prêt à aimer son majordome vampire.");
});

client.login(DISCORD_TOKEN);
