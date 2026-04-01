import express from "express";
import path from "path";
import fs from "fs";
import youtubedl from "youtube-dl-exec";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = path.resolve();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/download", async (req, res) => {
  try {
    let { path: userPath, url, format } = req.body;

    let finalSavePath =
      userPath && userPath.trim() !== ""
        ? path.normalize(userPath)
        : path.join(__dirname, "downloads");

    if (!fs.existsSync(finalSavePath)) {
      fs.mkdirSync(finalSavePath, { recursive: true });
    }

    const outputFile = path.join(finalSavePath, `%(title)s.%(ext)s`);

    // KONFIGURASI OPSI TERBAIK
    const dlOptions = {
      output: outputFile,
      noPlaylist: true,
      noCheckCertificates: true,
      // Menghindari error youtube yang sering muncul belakangan ini
      addHeader: [
        "referer:https://www.google.com/",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      ],
    };

    if (format === "mp3") {
      dlOptions.format = "bestaudio/best";
      dlOptions.extractAudio = true;
      dlOptions.audioFormat = "mp3";
    } else {
      // Mengambil format MP4 yang paling kompatibel (sudah ada video + audio)
      // agar tidak butuh ffmpeg untuk menggabungkan
      dlOptions.format =
        "bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    }

    const child = youtubedl.exec(url, dlOptions);

    child.stdout.on("data", (data) => {
      const output = data.toString();
      const match = output.match(/(\d+\.\d+)%/);
      if (match) {
        io.emit("downloadProgress", { progress: match[1] });
      }
    });

    // Menangani error dari proses yt-dlp secara lebih detail
    child.on("error", (err) => {
      console.error("Child Process Error:", err);
    });

    await child;
    res.json({ success: true });
  } catch (error) {
    console.error("❌ DETAIL ERROR:", error);
    res.json({
      success: false,
      message: "Gagal: Periksa koneksi atau update yt-dlp",
    });
  }
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Sistem Aktif di http://localhost:${PORT}`);
});
