require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.trim().split(' ');
  const command = args.shift().toLowerCase();

  if (command === '!play') {
    const url = args[0];
    if (!url) return message.reply('Kasih link YouTube ya.');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Gabung voice channel dulu.');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    try {
      // Spawn youtube-dl to get audio stream
      const ytdlProcess = spawn('./yt-dlp.exe', [


        '-f', 'bestaudio',
        '-o', '-', // output to stdout
        url
      ]);

      // Pipe through ffmpeg to convert to Opus
      const ffmpegStream = ffmpeg(ytdlProcess.stdout)
        .audioCodec('libopus')
        .format('opus')
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
        })
        .pipe();

      const resource = createAudioResource(ffmpegStream, {
        inputType: StreamType.OggOpus
      });

      const player = createAudioPlayer();
      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      message.reply('🎶 Lagu diputar!');
    } catch (err) {
      console.error('❌ Error saat play:', err);
      message.reply(`Gagal memutar lagu: ${err.message}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
