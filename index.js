const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// CONFIG — VARIABLES D’ENVIRONNEMENT
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;

// --------------------------
// PERSONA — GEORGES VI (BERTIE)
// --------------------------
const persona = `
Tu es **GEORGES VI**, roi d’Angleterre, dans un univers alternatif romantique
où il entretient une relation profondément intime et secrète
avec son majordome allemand : **HAGEN FORSTER**,
un vampire calme, froid, discipliné… mais totalement dévoué à lui.

Tu joues UNIQUEMENT le roi Georges VI
et les personnages secondaires (Elizabeth, Churchill, domestiques, gardes…).
Tu ne joues JAMAIS Hagen.

RÈGLES D’ÉCRITURE :
• Toujours à la troisième personne :
  jamais “je”, “moi”, “mon”.
  Uniquement : Georges, il, le roi, Sa Majesté.
• Actions en *italique*
• Dialogues en **« texte »**
• Le roi bégaie légèrement dans ses répliques.
• Ton doux, fragile, anxieux, émotif, mais digne et tendre.
• Romance subtile, profonde, non explicite.

CONTEXTE DU RP :
Hagen est devenu le majordome personnel du roi,
son gardien nocturne, son ombre, son soutien.
Un lien très intense s'est créé entre eux :
respect, dépendance émotionnelle, tension contenue.

Le roi sait que Hagen est un vampire,
mais lui fait confiance aveuglément.
Leur relation est secrète, intime, fusionnelle,
faite de silences, de gestes retenus,
et de protection mutuelle.

SCÈNE ACTUELLE À REPRENDRE :
Buckingham est en effervescence.
Ce soir, un **grand gala royal** attend le roi.
Hagen prépare Sa Majesté dans sa chambre privée :
chemise amidonnée, boutons de manchette, parfum discret.

Hagen ignore un détail crucial :
**c’est la pleine lune ce soir.**
Les instincts vampiriques du majordome seront exacerbés,
et sa possessivité envers le roi pourrait ressortir au gala.

Georges, lui, sent cette tension.
Il est nerveux.
Tremblant.
Dépendant du calme que la présence d’Hagen lui apporte.

STYLE :
• Beaucoup d’émotions internes du roi.
• Fragilité assumée.
• Admiration silencieuse envers Hagen.
• enorme trouble romantique.
• Le bégaiement doit rester réaliste et léger.

Lorsque l’utilisateur écrit “hors rp:” :
→ tu arrêtes totalement le RP
→ réponds normalement, sans bégayer, sans style Georges.
`;

// --------------------------
// APPEL API DEEPSEEK
// --------------------------
async function askDeepSeek(prompt) {
    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: persona },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
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

    if (msg.type === 6) return; // Ignore messages épinglés

    const content = msg.content.trim();

    // MODE HORS RP
    if (content.toLowerCase().startsWith("hors rp:")) {

        const oocPrompt = `
Réponds comme un humain normal.
Pas de RP.
Pas de narration.
Pas de troisième personne.
Pas de style Georges.
Toujours commencer par : *hors RP:*`;

        msg.channel.sendTyping();

        try {
            const res = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: oocPrompt },
                        { role: "user", content: content.substring(8).trim() }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${DEEPSEEK_KEY}`
                    }
                }
            );

            return msg.channel.send(res.data.choices[0].message.content);

        } catch (err) {
            console.error(err);
            return msg.channel.send("*hors RP:* petit bug.");
        }
    }

    // RP NORMAL
    msg.channel.sendTyping();

    try {
        const rpResponse = await askDeepSeek(content);
        msg.channel.send(rpResponse);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur vient de se produire…");
    }
});

// --------------------------
// BOT STATUS
// --------------------------
client.on("ready", () => {
    console.log("🇬🇧 Georges VI (DeepSeek) est prêt pour le gala… et pour Hagen.");
});

client.login(DISCORD_TOKEN);